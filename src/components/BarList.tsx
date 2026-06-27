import { formatPKR } from "@/lib/format";

/** Simple, dependency-free horizontal bar list for distributions. */
export function BarList({
  items,
  sub,
}: {
  items: { label: string; value: number; grams?: number }[];
  sub?: (it: { label: string; value: number; grams?: number }) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) {
    return <div className="text-sm text-gray-400 py-6 text-center">No data for this period.</div>;
  }
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-700">{it.label}</span>
            <span className="tnum font-semibold">
              {formatPKR(it.value)}
              {sub && <span className="text-gray-400 font-normal ml-2 text-xs">{sub(it)}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600"
              style={{ width: `${Math.max(3, (it.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Mini daily column chart (SVG, no deps). */
export function DailyChart({ data }: { data: { day: string; total: number }[] }) {
  if (data.length === 0) {
    return <div className="text-sm text-gray-400 py-10 text-center">No sales in this period.</div>;
  }
  const w = 640;
  const h = 160;
  const pad = 24;
  const max = Math.max(1, ...data.map((d) => d.total));
  const bw = (w - pad * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
      {data.map((d, i) => {
        const bh = ((h - pad * 2) * d.total) / max;
        const x = pad + i * bw;
        const y = h - pad - bh;
        return (
          <g key={d.day}>
            <rect
              x={x + bw * 0.15}
              y={y}
              width={bw * 0.7}
              height={bh}
              rx={3}
              className="fill-gold-500"
            />
            <text
              x={x + bw / 2}
              y={h - pad + 12}
              textAnchor="middle"
              className="fill-gray-400"
              fontSize={9}
            >
              {d.day.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
