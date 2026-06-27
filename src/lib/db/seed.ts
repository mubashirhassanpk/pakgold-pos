/**
 * Seed the database with realistic Pakistani gold-shop sample data.
 * Run with:  npm run db:seed
 *
 * Rates below are illustrative (mid-2025 ballpark). The shop will update them
 * daily from the dashboard — these just make the app usable out of the box.
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import { scryptSync, randomBytes } from "node:crypto";
import * as schema from "./schema";
import { KARAT_PURITY, GRAMS_PER_TOLA } from "../constants";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "pakgold.db");
const sqlite = new Database(DB_PATH);
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

// scrypt password hashing — same format as src/lib/auth.ts (scrypt$salt$key).
const hash = (s: string) => {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(s, salt, 64).toString("hex")}`;
};

function seed() {
  console.log("🌱 Seeding PakGold POS …");

  // --- Owner user (default login: owner / owner123) ---
  db.insert(schema.users)
    .values({ username: "owner", passwordHash: hash("owner123"), name: "Shop Owner", role: "owner" })
    .onConflictDoNothing()
    .run();

  // --- Shop profile ---
  const settings: Record<string, string> = {
    shop_name_en: "PakGold Jewellers",
    shop_name_ur: "پاک گولڈ جیولرز",
    address: "Sarafa Bazaar, Lahore",
    phone: "0300-1234567",
    ntn: "",
    strn: "",
    invoice_prefix: "PG",
    footer_terms_en: "Goods once sold are exchangeable within 7 days with original receipt.",
    footer_terms_ur: "فروخت شدہ مال 7 دن کے اندر اصل رسید کے ساتھ تبدیل ہو سکتا ہے۔",
  };
  for (const [key, value] of Object.entries(settings)) {
    db.insert(schema.settings).values({ key, value }).onConflictDoNothing().run();
  }

  // --- Gold rates per purity (per tola) ---
  const base24kSell = 250000; // Rs / tola, 24K
  const base24kBuy = 246000; // buyback is a bit lower
  for (const karat of [24, 22, 21, 18] as const) {
    const factor = KARAT_PURITY[karat].factor;
    db.insert(schema.goldRates)
      .values({
        karat,
        purityFactor: factor,
        sellPerTola: Math.round(base24kSell * factor),
        buyPerTola: Math.round(base24kBuy * factor),
        source: "manual",
      })
      .run();
  }

  // --- Silver (chandi) rates per fineness (per tola + per kg) ---
  const base999SilverSell = 3200; // Rs / tola, 999 fine silver
  const base999SilverBuy = 3100;
  for (const fineness of [999, 925, 900] as const) {
    const factor = fineness / 1000;
    const sellPerTola = Math.round(base999SilverSell * (factor / 0.999));
    const buyPerTola = Math.round(base999SilverBuy * (factor / 0.999));
    db.insert(schema.silverRates)
      .values({
        fineness,
        purityFactor: factor,
        sellPerTola,
        buyPerTola,
        sellPerKg: Math.round((sellPerTola / GRAMS_PER_TOLA) * 1000),
        buyPerKg: Math.round((buyPerTola / GRAMS_PER_TOLA) * 1000),
        source: "manual",
      })
      .run();
  }

  // --- Categories ---
  const categories = [
    { nameEn: "Necklace Set", nameUr: "سیٹ" },
    { nameEn: "Ring", nameUr: "انگوٹھی" },
    { nameEn: "Bangles", nameUr: "چوڑیاں" },
    { nameEn: "Earrings", nameUr: "بالیاں" },
    { nameEn: "Bracelet", nameUr: "بریسلٹ" },
    { nameEn: "Chain", nameUr: "زنجیر" },
    { nameEn: "Coin", nameUr: "سکہ" },
    { nameEn: "Bar / Biscuit", nameUr: "بسکٹ" },
    { nameEn: "Tops / Studs", nameUr: "ٹاپس" },
    { nameEn: "Pendant", nameUr: "لاکٹ" },
  ];
  const catIds: number[] = [];
  for (const c of categories) {
    const r = db.insert(schema.categories).values(c).returning({ id: schema.categories.id }).get();
    catIds.push(r.id);
  }

  // --- Sample inventory items ---
  const items = [
    { barcode: "PG00001", nameEn: "Gold Ring Plain 22K", nameUr: "سادہ انگوٹھی", cat: 1, karat: 22, gross: 5.5, net: 5.5, mType: "per_gram", mVal: 900, hall: "916" },
    { barcode: "PG00002", nameEn: "Bangles Pair 22K", nameUr: "چوڑیاں جوڑا", cat: 2, karat: 22, gross: 23.3, net: 23.0, mType: "per_gram", mVal: 750, hall: "916" },
    { barcode: "PG00003", nameEn: "Necklace Set 21K", nameUr: "سیٹ", cat: 0, karat: 21, gross: 46.6, net: 44.0, mType: "percent", mVal: 12, hall: "875" },
    { barcode: "PG00004", nameEn: "1 Tola Coin 24K", nameUr: "ایک تولہ سکہ", cat: 6, karat: 24, gross: 11.664, net: 11.664, mType: "fixed", mVal: 2500, hall: "999" },
    { barcode: "PG00005", nameEn: "Chain 22K", nameUr: "زنجیر", cat: 5, karat: 22, gross: 12.0, net: 11.8, mType: "per_gram", mVal: 850, hall: "916" },
  ] as const;

  for (const it of items) {
    db.insert(schema.inventoryItems)
      .values({
        barcode: it.barcode,
        nameEn: it.nameEn,
        nameUr: it.nameUr,
        categoryId: catIds[it.cat],
        karat: it.karat,
        grossWeight: it.gross,
        netWeight: it.net,
        makingType: it.mType,
        makingValue: it.mVal,
        wastageType: "charge_pct",
        wastageValue: 2,
        hallmark: it.hall,
        quantity: 1,
      })
      .onConflictDoNothing()
      .run();
  }

  // --- A walk-in customer ---
  db.insert(schema.customers)
    .values({ name: "Walk-in Customer", phone: "" })
    .onConflictDoNothing()
    .run();

  // --- Default tax rules (all sample; OWNER must verify with their FBR status) ---
  db.insert(schema.taxRules)
    .values([
      { name: "Sales Tax on Making (3%)", basis: "making_only", ratePct: 3, active: true },
      { name: "Full Value Addition (1%)", basis: "gold_plus_making", ratePct: 1, active: false },
      { name: "Fixed Small-Shop Tax", basis: "fixed", fixedAmount: 0, active: false },
    ])
    .run();

  console.log("✅ Seed complete. Login: owner / owner123");
}

seed();
sqlite.close();
