/**
 * Account recovery — use when a login username/password is forgotten.
 * Run on the machine that has the database file.
 *
 *   List all users (to find the username):
 *     npm run reset-password
 *
 *   Reset a user's password (also re-enables a disabled account):
 *     npm run reset-password -- <username> <new-password>
 *
 * DB location: $DATABASE_PATH, else ./data/pakgold.db, else ./pakgold.db
 */
import Database from "better-sqlite3";
import { scryptSync, randomBytes } from "node:crypto";
import path from "node:path";
import fs from "node:fs";

function resolveDb() {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  const candidates = [
    path.join(process.cwd(), "data", "pakgold.db"),
    path.join(process.cwd(), "pakgold.db"),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return candidates[0];
}

const DB_PATH = resolveDb();
if (!fs.existsSync(DB_PATH)) {
  console.error("Database not found at:", DB_PATH);
  console.error("Set DATABASE_PATH to your pakgold.db and try again.");
  process.exit(1);
}

const db = new Database(DB_PATH);
const [username, newPassword] = process.argv.slice(2);

if (!username) {
  // List users so a forgotten username can be found.
  const rows = db.prepare("SELECT id, username, name, role, active FROM users ORDER BY id").all();
  console.log("Users in", DB_PATH, ":\n");
  for (const u of rows) {
    console.log(`  #${u.id}  ${u.username}  (${u.name}, ${u.role})${u.active ? "" : "  [disabled]"}`);
  }
  console.log("\nTo reset a password:  npm run reset-password -- <username> <new-password>");
  db.close();
  process.exit(0);
}

if (!newPassword || newPassword.length < 6) {
  console.error("Provide a new password of at least 6 characters:");
  console.error("  npm run reset-password --", username, "<new-password>");
  db.close();
  process.exit(1);
}

const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username.trim().toLowerCase());
if (!user) {
  console.error(`No user named "${username}". Run without arguments to list usernames.`);
  db.close();
  process.exit(1);
}

const salt = randomBytes(16).toString("hex");
const hash = `scrypt$${salt}$${scryptSync(newPassword, salt, 64).toString("hex")}`;
db.prepare("UPDATE users SET password_hash = ?, active = 1 WHERE id = ?").run(hash, user.id);
db.close();
console.log(`✅ Password reset for "${username}". You can log in now (account is active).`);
