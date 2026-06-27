"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import { verifyPassword, hashPassword, createSession, destroySession, getCurrentUser } from "./auth";

export interface LoginState {
  error?: string;
}

/** useActionState-compatible login action. */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Enter username and password" };

  const user = db.select().from(schema.users).where(eq(schema.users.username, username)).get();
  if (!user || !user.active) return { error: "Invalid username or password" };

  // Legacy upgrade: seed shipped SHA-256 hashes. If the stored hash isn't in the
  // scrypt format, accept the legacy match once, then transparently re-hash.
  let ok = false;
  if (user.passwordHash.startsWith("scrypt$")) {
    ok = verifyPassword(password, user.passwordHash);
  } else {
    const { createHash } = await import("node:crypto");
    ok = createHash("sha256").update(password).digest("hex") === user.passwordHash;
    if (ok) {
      db.update(schema.users)
        .set({ passwordHash: hashPassword(password) })
        .where(eq(schema.users.id, user.id))
        .run();
    }
  }
  if (!ok) return { error: "Invalid username or password" };

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/**
 * Self-service password change for the logged-in user (works for the owner and
 * any staff). Requires the current password so a walk-up can't hijack a session.
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return { ok: false as const, error: "Not signed in" };
  if (newPassword.length < 6) return { ok: false as const, error: "New password must be at least 6 characters" };

  const user = db.select().from(schema.users).where(eq(schema.users.id, sessionUser.id)).get();
  if (!user) return { ok: false as const, error: "User not found" };

  // Verify the current password (supports legacy SHA-256 hashes too).
  let ok = false;
  if (user.passwordHash.startsWith("scrypt$")) {
    ok = verifyPassword(currentPassword, user.passwordHash);
  } else {
    const { createHash } = await import("node:crypto");
    ok = createHash("sha256").update(currentPassword).digest("hex") === user.passwordHash;
  }
  if (!ok) return { ok: false as const, error: "Current password is incorrect" };

  db.update(schema.users)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(schema.users.id, user.id))
    .run();
  db.insert(schema.auditLog)
    .values({
      userId: user.id,
      action: "password_change",
      entity: "user",
      entityId: String(user.id),
      detail: "changed own password",
    })
    .run();
  return { ok: true as const };
}
