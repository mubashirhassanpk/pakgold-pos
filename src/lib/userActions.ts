"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "./db";
import { getCurrentUser, hashPassword, ALL_AREAS, STAFF_ROLES } from "./auth";

const ROLES = ["owner", "manager", "accountant", "salesman"];

/** User management is owner-only. */
async function requireOwner() {
  const user = await getCurrentUser();
  if (user?.role !== "owner") throw new Error("Only the owner can manage users");
  return user;
}

export interface NewUserInput {
  username: string;
  name: string;
  role: string;
  password: string;
}

export async function createUser(input: NewUserInput) {
  await requireOwner();
  const username = input.username.trim().toLowerCase();
  if (!username || !input.name.trim()) return { ok: false as const, error: "Username and name required" };
  if (input.password.length < 6) return { ok: false as const, error: "Password must be at least 6 characters" };
  if (!ROLES.includes(input.role)) return { ok: false as const, error: "Invalid role" };

  const exists = db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.username, username)).get();
  if (exists) return { ok: false as const, error: "Username already taken" };

  db.insert(schema.users)
    .values({
      username,
      name: input.name.trim(),
      role: input.role,
      passwordHash: hashPassword(input.password),
      active: true,
    })
    .run();
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function setUserActive(id: number, active: boolean) {
  const owner = await requireOwner();
  if (owner.id === id && !active) return { ok: false as const, error: "You cannot deactivate yourself" };
  db.update(schema.users).set({ active }).where(eq(schema.users.id, id)).run();
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function setUserRole(id: number, role: string) {
  const owner = await requireOwner();
  if (!ROLES.includes(role)) return { ok: false as const, error: "Invalid role" };
  if (owner.id === id && role !== "owner") return { ok: false as const, error: "You cannot change your own role" };
  db.update(schema.users).set({ role }).where(eq(schema.users.id, id)).run();
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function resetUserPassword(id: number, password: string) {
  await requireOwner();
  if (password.length < 6) return { ok: false as const, error: "Password must be at least 6 characters" };
  db.update(schema.users).set({ passwordHash: hashPassword(password) }).where(eq(schema.users.id, id)).run();
  revalidatePath("/settings");
  return { ok: true as const };
}

/**
 * Save the per-role feature access matrix. `config` maps each staff role to the
 * list of area keys it may access. Owner is always full and is ignored here.
 */
export async function updateRoleAccess(config: Record<string, string[]>) {
  const owner = await requireOwner();
  const validAreas = new Set(ALL_AREAS.map((a) => a.key));
  const clean: Record<string, string[]> = {};
  for (const role of STAFF_ROLES) {
    const list = Array.isArray(config[role]) ? config[role] : [];
    clean[role] = list.filter((a) => validAreas.has(a));
  }
  const value = JSON.stringify(clean);
  db.insert(schema.settings)
    .values({ key: "role_access", value })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value } })
    .run();
  db.insert(schema.auditLog)
    .values({ userId: owner.id, action: "role_access_update", entity: "settings", entityId: "role_access", detail: value })
    .run();
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
