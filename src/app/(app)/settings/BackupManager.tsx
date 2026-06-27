"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Database, Download, Trash2, Upload, ShieldCheck } from "lucide-react";
import { createBackupAction, deleteBackupAction, restoreAction } from "@/lib/backupActions";
import { formatDateTime } from "@/lib/format";

interface BackupFile {
  name: string;
  size: number;
  createdAt: number;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function BackupManager({ initial }: { initial: BackupFile[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const router = useRouter();

  function backupNow() {
    setMsg("");
    start(async () => {
      const res = await createBackupAction();
      if (res.ok) setMsg(`✓ Backup created: ${res.name}`);
      router.refresh();
    });
  }

  function remove(name: string) {
    if (!confirm(`Delete backup ${name}?`)) return;
    start(async () => {
      await deleteBackupAction(name);
      router.refresh();
    });
  }

  function restore(formData: FormData) {
    setRestoreMsg(null);
    start(async () => {
      const res = await restoreAction(formData);
      if (res.ok) {
        setRestoreMsg({
          ok: true,
          text: "Backup staged. Close & restart PakGold POS to complete the restore.",
        });
      } else {
        setRestoreMsg({ ok: false, text: res.error });
      }
    });
  }

  return (
    <section className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={18} className="text-success" />
        <h2 className="font-semibold">Backup &amp; Restore</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Your shop data lives only on this PC. Back up regularly and keep a copy on a USB or cloud drive.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={backupNow}
          disabled={pending}
          className="flex items-center gap-2 rounded-lg bg-gold text-navy-900 font-semibold px-4 py-2 text-sm hover:brightness-105 disabled:opacity-60"
        >
          <Database size={16} /> Create Backup
        </button>
        <a
          href="/api/backup"
          className="flex items-center gap-2 rounded-lg bg-navy-900 text-white font-semibold px-4 py-2 text-sm hover:bg-navy-800"
        >
          <Download size={16} /> Backup &amp; Download
        </a>
      </div>
      {msg && <div className="text-success text-sm mb-3">{msg}</div>}

      {/* Backup list */}
      <div className="divide-y divide-gray-100 border-y border-gray-100">
        {initial.map((b) => (
          <div key={b.name} className="flex items-center gap-3 py-2.5 text-sm">
            <Database size={15} className="text-gray-300" />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs truncate">{b.name}</div>
              <div className="text-xs text-gray-400">
                {formatDateTime(b.createdAt)} • {fmtSize(b.size)}
              </div>
            </div>
            <a href={`/api/backup/${b.name}`} className="text-gray-400 hover:text-navy-900" title="Download">
              <Download size={16} />
            </a>
            <button onClick={() => remove(b.name)} className="text-gray-400 hover:text-red-500" title="Delete">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {initial.length === 0 && <div className="py-3 text-sm text-gray-400">No backups yet.</div>}
      </div>

      {/* Restore */}
      <div className="mt-4 rounded-xl bg-gray-50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium mb-2">
          <Upload size={16} /> Restore from a backup file
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Restoring replaces ALL current data. The app must be restarted to finish.
        </p>
        <form action={restore} className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            name="file"
            accept=".db"
            required
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:text-white file:px-3 file:py-1.5"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-red-600 text-white text-sm font-semibold px-4 py-2 hover:brightness-110 disabled:opacity-60"
          >
            Restore
          </button>
        </form>
        {restoreMsg && (
          <div className={`text-sm mt-2 ${restoreMsg.ok ? "text-success" : "text-red-600"}`}>
            {restoreMsg.text}
          </div>
        )}
      </div>
    </section>
  );
}
