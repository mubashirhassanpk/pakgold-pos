/**
 * Apply Drizzle migrations to the local SQLite file.
 * Run with:  npm run db:migrate
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "pakgold.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
console.log("✅ Migrations applied to", DB_PATH);
sqlite.close();
