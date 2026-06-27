/**
 * Drizzle + better-sqlite3 client.
 *
 * better-sqlite3 is synchronous and extremely fast — perfect for a local POS
 * where the Next.js server and the database live on the same shop machine.
 * The connection is cached on globalThis so Next's dev hot-reload does not
 * open a new handle on every change.
 */
import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { scryptSync, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "pakgold.db");

const globalForDb = globalThis as unknown as {
  __pakgoldSqlite?: Database.Database;
};

/**
 * Restart-safe restore: if a staged restore file exists (written by the restore
 * action), swap it into place BEFORE opening the DB. Doing this at startup
 * avoids fighting the open file handle / Windows file lock.
 */
function applyPendingRestore() {
  const pending = `${DB_PATH}.restore`;
  if (!fs.existsSync(pending)) return;
  // Clear stale WAL/SHM so they don't override the restored file.
  for (const ext of ["-wal", "-shm"]) {
    if (fs.existsSync(DB_PATH + ext)) fs.rmSync(DB_PATH + ext);
  }
  fs.copyFileSync(pending, DB_PATH);
  fs.rmSync(pending);
  console.log("♻️  Restored database from staged backup.");
}

/**
 * Seed the bare minimum so a fresh hosted deploy is usable immediately:
 * owner login + shop profile + base rates + categories + tax rules. Mirrors
 * `db:seed` but without sample stock, using raw SQL (no extra deps at runtime).
 */
function seedMinimal(sqlite: Database.Database) {
  const hash = (s: string) => {
    const salt = randomBytes(16).toString("hex");
    return `scrypt$${salt}$${scryptSync(s, salt, 64).toString("hex")}`;
  };
  const GRAMS_PER_TOLA = 11.664;
  const KARAT_FACTOR: Record<number, number> = { 24: 0.999, 22: 0.916, 21: 0.875, 18: 0.75 };
  const tx = sqlite.transaction(() => {
    sqlite
      .prepare("INSERT INTO users (username, password_hash, name, role) VALUES (?,?,?,?)")
      .run("owner", hash("owner123"), "Shop Owner", "owner");
    const settings: Record<string, string> = {
      shop_name_en: "PakGold Jewellers",
      shop_name_ur: "پاک گولڈ جیولرز",
      address: "Sarafa Bazaar, Lahore",
      phone: "0300-1234567",
      invoice_prefix: "PG",
      footer_terms_en: "Goods once sold are exchangeable within 7 days with original receipt.",
      footer_terms_ur: "فروخت شدہ مال 7 دن کے اندر اصل رسید کے ساتھ تبدیل ہو سکتا ہے۔",
    };
    const insS = sqlite.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?,?)");
    for (const [k, v] of Object.entries(settings)) insS.run(k, v);
    const insG = sqlite.prepare(
      "INSERT INTO gold_rates (karat, purity_factor, sell_per_tola, buy_per_tola, source) VALUES (?,?,?,?, 'manual')"
    );
    for (const k of [24, 22, 21, 18]) {
      const f = KARAT_FACTOR[k];
      insG.run(k, f, Math.round(250000 * f), Math.round(246000 * f));
    }
    const insAg = sqlite.prepare(
      "INSERT INTO silver_rates (fineness, purity_factor, sell_per_tola, buy_per_tola, sell_per_kg, buy_per_kg, source) VALUES (?,?,?,?,?,?, 'manual')"
    );
    for (const fn of [999, 925, 900]) {
      const f = fn / 1000;
      const spt = Math.round(3200 * (f / 0.999));
      const bpt = Math.round(3100 * (f / 0.999));
      insAg.run(fn, f, spt, bpt, Math.round((spt / GRAMS_PER_TOLA) * 1000), Math.round((bpt / GRAMS_PER_TOLA) * 1000));
    }
    const insC = sqlite.prepare("INSERT INTO categories (name_en, name_ur) VALUES (?,?)");
    (
      [
        ["Necklace Set", "سیٹ"], ["Ring", "انگوٹھی"], ["Bangles", "چوڑیاں"], ["Earrings", "بالیاں"],
        ["Bracelet", "بریسلٹ"], ["Chain", "زنجیر"], ["Coin", "سکہ"], ["Bar / Biscuit", "بسکٹ"],
        ["Tops / Studs", "ٹاپس"], ["Pendant", "لاکٹ"],
      ] as const
    ).forEach(([a, b]) => insC.run(a, b));
    sqlite.prepare("INSERT INTO customers (name, phone) VALUES (?,?)").run("Walk-in Customer", "");
    const insT = sqlite.prepare(
      "INSERT INTO tax_rules (name, basis, rate_pct, fixed_amount, active) VALUES (?,?,?,?,?)"
    );
    insT.run("Sales Tax on Making (3%)", "making_only", 3, null, 1);
    insT.run("Full Value Addition (1%)", "gold_plus_making", 1, null, 0);
    insT.run("Fixed Small-Shop Tax", "fixed", null, 0, 0);
  });
  tx();
  console.log("✅ PakGold: first-run base data seeded (login: owner / owner123).");
}

/**
 * Make a freshly hosted deploy self-initialising: apply migrations (idempotent)
 * and seed once if the DB is empty. Skipped during `next build` and opt-out via
 * PAKGOLD_AUTO_INIT=0. Failures are logged, not fatal (a launcher may already
 * have migrated). Desktop/standalone setups that pre-migrate are unaffected.
 */
function ensureSchema(sqlite: Database.Database) {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.PAKGOLD_AUTO_INIT === "0") return;
  try {
    migrate(drizzle(sqlite), { migrationsFolder: path.join(process.cwd(), "drizzle") });
    const row = sqlite.prepare("SELECT count(*) AS c FROM users").get() as { c: number };
    if (row.c === 0) seedMinimal(sqlite);
  } catch (e) {
    console.error("[pakgold] auto schema init skipped:", e instanceof Error ? e.message : e);
  }
}

function createConnection(): Database.Database {
  // Make sure the folder for DATABASE_PATH exists (e.g. a persistent path on a
  // host), otherwise better-sqlite3 can't create the file.
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  applyPendingRestore();
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL"); // better concurrency + crash safety
  sqlite.pragma("foreign_keys = ON");
  ensureSchema(sqlite);
  return sqlite;
}

export const sqlite = globalForDb.__pakgoldSqlite ?? createConnection();
if (process.env.NODE_ENV !== "production") globalForDb.__pakgoldSqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { schema };
