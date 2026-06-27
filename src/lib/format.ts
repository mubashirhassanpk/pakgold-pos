/** Display formatting helpers (currency, weight, dates). */
import { gramsToTola } from "./units";
import { toTolaMashaBreakdown } from "./units";

/** Format a rupee amount: "Rs 1,23,456" (Pakistani digit grouping optional). */
export function formatPKR(amount: number, opts?: { decimals?: boolean }): string {
  const decimals = opts?.decimals ?? false;
  return (
    "Rs " +
    amount.toLocaleString("en-PK", {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    })
  );
}

/** Compact gram + tola side-by-side string, e.g. "11.664 g  (1.000 tola)". */
export function formatWeightDual(grams: number): string {
  return `${grams.toFixed(3)} g  (${gramsToTola(grams).toFixed(3)} tola)`;
}

/** Traditional breakdown string, e.g. "1 tola 2 masha". */
export function formatTolaMasha(grams: number): string {
  const b = toTolaMashaBreakdown(grams);
  const parts: string[] = [];
  if (b.tola) parts.push(`${b.tola} tola`);
  if (b.masha) parts.push(`${b.masha} masha`);
  if (b.remainderGrams) parts.push(`${b.remainderGrams.toFixed(3)} g`);
  return parts.length ? parts.join(" ") : "0";
}

export function formatDateTime(d: Date | number): string {
  const date = typeof d === "number" ? new Date(d) : d;
  return date.toLocaleString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
