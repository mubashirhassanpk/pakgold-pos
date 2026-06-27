"use client";

import { useEffect } from "react";

const RELOAD_KEY = "pakgold_chunk_reload_at";

function isChunkError(error: Error): boolean {
  const s = `${error?.name ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return (
    s.includes("chunkloaderror") ||
    s.includes("loading chunk") ||
    s.includes("loading css chunk") ||
    s.includes("dynamically imported module") ||
    s.includes("failed to fetch")
  );
}

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const chunk = isChunkError(error);

  useEffect(() => {
    if (!chunk) return;
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || "0");
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
      window.location.reload();
    }
  }, [chunk]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">
          {chunk ? "Updating…" : "Something went wrong"}
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          {chunk ? "Loading the latest version, please wait…" : "An unexpected error occurred."}
        </p>
        <button
          onClick={() => (chunk ? window.location.reload() : reset())}
          className="mt-4 rounded-lg bg-gold text-navy-900 font-semibold px-6 py-2.5 hover:brightness-105"
        >
          {chunk ? "Reload now" : "Try again"}
        </button>
      </div>
    </div>
  );
}
