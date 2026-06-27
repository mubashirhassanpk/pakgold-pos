import { Construction } from "lucide-react";

export function ComingSoon({
  title,
  titleUr,
  phase,
  desc,
  bare,
}: {
  title: string;
  titleUr: string;
  phase: string;
  desc: string;
  bare?: boolean;
}) {
  const inner = (
    <div className="rounded-2xl bg-white ring-1 ring-black/5 p-10 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center mb-4">
        <Construction size={26} />
      </div>
      <h2 className="text-xl font-bold">
        {title} <span className="urdu text-gray-400 text-base">{titleUr}</span>
      </h2>
      <span className="inline-block mt-2 rounded-full bg-navy-900 text-white text-xs px-3 py-1">{phase}</span>
      <p className="text-sm text-gray-500 mt-3 max-w-md mx-auto">{desc}</p>
    </div>
  );
  if (bare) return inner;
  return <div className="p-6 max-w-3xl mx-auto">{inner}</div>;
}
