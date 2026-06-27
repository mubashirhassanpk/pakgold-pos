/**
 * Authentication — password hashing (scrypt, built-in) + cookie sessions.
 *
 * We use Node's crypto.scrypt (no native bcrypt dependency) so the app stays
 * easy to build and fully offline. Hash format:  scrypt$<saltHex>$<keyHex>
 */
import "server-only";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq, lt } from "drizzle-orm";
import { db, schema } from "./db";

const SESSION_COOKIE = "pakgold_session";
const SESSION_DAYS = 14;
const SCRYPT_KEYLEN = 64;

// --- Password hashing --------------------------------------------------------
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${salt}$${key}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, keyHex] = parts;
  const key = Buffer.from(keyHex, "hex");
  const test = scryptSync(password, salt, key.length);
  return key.length === test.length && timingSafeEqual(key, test);
}

// --- Sessions ----------------------------------------------------------------
export interface SessionUser {
  id: number;
  username: string;
  name: string;
  role: string;
}

export async function createSession(userId: number): Promise<void> {
  const sid = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  db.insert(schema.sessions).values({ id: sid, userId, expiresAt }).run();
  // Best-effort cleanup of expired sessions.
  db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, Date.now())).run();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (sid) db.delete(schema.sessions).where(eq(schema.sessions.id, sid)).run();
  jar.delete(SESSION_COOKIE);
}

/** Resolve the current logged-in user from the session cookie, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const row = db
    .select({
      id: schema.users.id,
      username: schema.users.username,
      name: schema.users.name,
      role: schema.users.role,
      expiresAt: schema.sessions.expiresAt,
      active: schema.users.active,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.id, sid))
    .get();
  if (!row || row.expiresAt < Date.now() || !row.active) return null;
  return { id: row.id, username: row.username, name: row.name, role: row.role };
}

// --- Role-based access -------------------------------------------------------
/**
 * Every feature area that can be granted to a staff role, with a label for the
 * permissions UI. The owner always has all of them and cannot be restricted.
 */
export const ALL_AREAS: { key: string; label: string }[] = [
  { key: "pos", label: "New Sale (POS)" },
  { key: "buygold", label: "Buy Old Gold" },
  { key: "rates", label: "Gold / Silver Rates" },
  { key: "inventory", label: "Inventory" },
  { key: "customers", label: "Customers" },
  { key: "committees", label: "Committees / BC" },
  { key: "repairs", label: "Repairs" },
  { key: "bookings", label: "Bookings" },
  { key: "karigars", label: "Karigars" },
  { key: "suppliers", label: "Suppliers" },
  { key: "invoices", label: "Invoices" },
  { key: "receivables", label: "Udhaar / Receivables" },
  { key: "expenses", label: "Expenses" },
  { key: "dayclose", label: "Day Close" },
  { key: "goldledger", label: "Gold Ledger" },
  { key: "reports", label: "Reports" },
  { key: "audit", label: "Audit Log" },
  { key: "settings", label: "Settings" },
];

export const STAFF_ROLES = ["manager", "accountant", "salesman"] as const;

/** Coarse default permissions. Owner/Manager run the shop; salesman bills only. */
export const ROLE_ACCESS: Record<string, string[]> = {
  owner: ALL_AREAS.map((a) => a.key),
  manager: ["pos", "buygold", "rates", "inventory", "customers", "committees", "repairs", "bookings", "karigars", "suppliers", "invoices", "receivables", "expenses", "dayclose", "goldledger", "reports", "audit", "settings"],
  accountant: ["reports", "customers", "committees", "invoices", "receivables", "inventory", "karigars", "suppliers", "expenses", "dayclose", "goldledger"],
  salesman: ["pos", "buygold", "inventory", "customers", "repairs", "bookings", "invoices"],
};

/** Owner-defined per-role overrides, stored as JSON in settings(key='role_access'). */
function readRoleAccessOverrides(): Record<string, string[]> {
  const row = db.select().from(schema.settings).where(eq(schema.settings.key, "role_access")).get();
  if (!row?.value) return {};
  try {
    const parsed = JSON.parse(row.value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string[]>) : {};
  } catch {
    return {};
  }
}

/**
 * The effective list of areas a role may access. Owner always gets everything;
 * other roles use the owner's saved overrides if present, else the defaults.
 */
export function getEffectiveAccess(role: string | undefined): string[] {
  if (!role) return [];
  if (role === "owner") return ALL_AREAS.map((a) => a.key);
  const overrides = readRoleAccessOverrides();
  if (Array.isArray(overrides[role])) return overrides[role];
  return ROLE_ACCESS[role] ?? [];
}

export function can(role: string | undefined, area: string): boolean {
  if (!role) return false;
  if (role === "owner") return true;
  return getEffectiveAccess(role).includes(area);
}
