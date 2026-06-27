"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { createBackup, deleteBackup, stageRestore } from "./backup";

async function requireOwner() {
  const user = await getCurrentUser();
  if (user?.role !== "owner") throw new Error("Only the owner can manage backups");
}

export async function createBackupAction() {
  await requireOwner();
  const name = await createBackup();
  revalidatePath("/settings");
  return { ok: true as const, name };
}

export async function deleteBackupAction(name: string) {
  await requireOwner();
  const ok = deleteBackup(name);
  revalidatePath("/settings");
  return { ok };
}

export async function restoreAction(formData: FormData) {
  await requireOwner();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Please choose a backup file" };
  }
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    stageRestore(buf);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Invalid backup file" };
  }
}
