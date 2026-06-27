/**
 * PakGold POS launcher — for non-technical users (double-click Start PakGold.bat).
 *
 * 1. Stores shop data in ./data/pakgold.db (separate from the app, survives updates)
 * 2. Applies any pending DB migrations
 * 3. Seeds first-run sample data if the DB is empty
 * 4. Starts the local server and opens the browser
 *
 * Requires `npm run build` to have been run once (done by "Install PakGold.bat").
 */
import { spawn, spawnSync } from "node:child_process";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const PORT = process.env.PORT || "3000";
const URL = `http://localhost:${PORT}`;
const appDir = process.cwd();

// 1. Persistent data location (outside .next so updates never wipe shop data).
const dataDir = path.join(appDir, "data");
fs.mkdirSync(dataDir, { recursive: true });
const DB_PATH = process.env.DATABASE_PATH || path.join(dataDir, "pakgold.db");
const env = { ...process.env, DATABASE_PATH: DB_PATH, PORT };

console.log("PakGold POS — starting…");
console.log("Database:", DB_PATH);

// 2. Migrate (idempotent).
try {
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("foreign_keys = ON");
  migrate(drizzle(sqlite), { migrationsFolder: path.join(appDir, "drizzle") });
  // 3. Seed only if there are no users yet (first run).
  const userCount = sqlite.prepare("SELECT count(*) c FROM users").get().c;
  sqlite.close();
  if (userCount === 0) {
    console.log("First run — loading sample data…");
    spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "db:seed"], {
      stdio: "inherit",
      shell: true,
      env,
    });
  }
} catch (e) {
  console.error("Database setup failed:", e.message);
  process.exit(1);
}

// 4. Start the server.
const server = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "start", "--", "-p", PORT], {
  stdio: "inherit",
  shell: true,
  env,
});

// Open the browser once the server is up.
async function waitAndOpen() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${URL}/login`);
      if (res.ok || res.status === 200) break;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log(`\n✅ PakGold POS is running at ${URL}\n   Keep this window open while you use the app.\n`);
  const opener =
    process.platform === "win32" ? ["cmd", ["/c", "start", "", URL]] :
    process.platform === "darwin" ? ["open", [URL]] :
    ["xdg-open", [URL]];
  try { spawn(opener[0], opener[1], { shell: true, detached: true }); } catch {}
}
waitAndOpen();

const shutdown = () => { server.kill(); process.exit(0); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
