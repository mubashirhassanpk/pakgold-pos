/**
 * First-run DB setup for the Electron build: apply migrations and seed minimal
 * starting data. Uses the standalone bundle's native modules (built for
 * Electron's ABI) so better-sqlite3 loads correctly inside Electron.
 */
const path = require("node:path");
const { createRequire } = require("node:module");
const { scryptSync, randomBytes } = require("node:crypto");

function hashPassword(pw) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(pw, salt, 64).toString("hex")}`;
}

const KARAT = { 24: 0.999, 22: 0.916, 21: 0.875, 18: 0.75 };

function initDatabase({ standaloneDir, drizzleDir, dbPath }) {
  // Resolve modules from the standalone bundle (Electron-ABI native binaries).
  const req = createRequire(path.join(standaloneDir, "server.js"));
  const Database = req("better-sqlite3");
  const { drizzle } = req("drizzle-orm/better-sqlite3");
  const { migrate } = req("drizzle-orm/better-sqlite3/migrator");

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  migrate(drizzle(sqlite), { migrationsFolder: drizzleDir });

  const userCount = sqlite.prepare("SELECT count(*) c FROM users").get().c;
  if (userCount === 0) {
    const now = Date.now();
    sqlite
      .prepare("INSERT INTO users (username,password_hash,name,role,active,created_at) VALUES (?,?,?,?,1,?)")
      .run("owner", hashPassword("owner123"), "Shop Owner", "owner", now);

    const settings = {
      shop_name_en: "PakGold Jewellers",
      shop_name_ur: "پاک گولڈ جیولرز",
      address: "Sarafa Bazaar",
      phone: "",
      ntn: "",
      strn: "",
      invoice_prefix: "PG",
      footer_terms_en: "Goods once sold are exchangeable within 7 days with original receipt.",
      footer_terms_ur: "فروخت شدہ مال 7 دن کے اندر اصل رسید کے ساتھ تبدیل ہو سکتا ہے۔",
    };
    const insSetting = sqlite.prepare("INSERT INTO settings (key,value) VALUES (?,?)");
    for (const [k, v] of Object.entries(settings)) insSetting.run(k, v);

    const base = 250000;
    const insRate = sqlite.prepare(
      "INSERT INTO gold_rates (karat,purity_factor,sell_per_tola,buy_per_tola,source,effective_at) VALUES (?,?,?,?, 'manual', ?)"
    );
    for (const k of [24, 22, 21, 18]) {
      insRate.run(k, KARAT[k], Math.round(base * KARAT[k]), Math.round(base * 0.984 * KARAT[k]), now);
    }

    const cats = [
      ["Necklace Set", "سیٹ"], ["Ring", "انگوٹھی"], ["Bangles", "چوڑیاں"], ["Earrings", "بالیاں"],
      ["Bracelet", "بریسلٹ"], ["Chain", "زنجیر"], ["Coin", "سکہ"], ["Bar / Biscuit", "بسکٹ"],
      ["Tops / Studs", "ٹاپس"], ["Pendant", "لاکٹ"],
    ];
    const insCat = sqlite.prepare("INSERT INTO categories (name_en,name_ur) VALUES (?,?)");
    for (const [en, ur] of cats) insCat.run(en, ur);

    const insTax = sqlite.prepare(
      "INSERT INTO tax_rules (name,basis,rate_pct,fixed_amount,active) VALUES (?,?,?,?,?)"
    );
    insTax.run("Sales Tax on Making (3%)", "making_only", 3, null, 1);
    insTax.run("Full Value Addition (1%)", "gold_plus_making", 1, null, 0);
    insTax.run("Fixed Small-Shop Tax", "fixed", null, 0, 0);
  }

  sqlite.close();
}

module.exports = { initDatabase };
