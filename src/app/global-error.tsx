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

/**
 * Root error boundary. If the failure is a stale-chunk load (common right after
 * an app update while a tab is still open), reload once automatically so the
 * user never sees the scary error. Guarded by a timestamp to avoid reload loops.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f6f7f9", margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#0B1120" }}>
              <span style={{ color: "#D4AF37" }}>Pak</span>Gold POS
            </div>
            <p style={{ color: "#555", marginTop: 12 }}>
              {chunk ? "Updating to the latest version… reloading." : "Something went wrong."}
            </p>
            <button
              onClick={() => (chunk ? window.location.reload() : reset())}
              style={{
                marginTop: 16,
                background: "#D4AF37",
                color: "#0B1120",
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                cursor: "pointer",
              }}
            >
              {chunk ? "Reload now" : "Try again"}
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
