"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Barcode } from "@/components/Barcode";
import { LABEL_PROFILES, getLabelProfile, type LabelProfile } from "@/lib/constants";

interface Item {
  id: number;
  barcode: string;
  nameEn: string;
  karat: number;
  netWeight: number;
}

export function LabelSheet({ items, shopName }: { items: Item[]; shopName: string }) {
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [copies, setCopies] = useState(1);
  const [profileId, setProfileId] = useState(LABEL_PROFILES[2].id);

  // Remember the last-used label profile for this shop machine.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pakgold_label_profile");
      if (saved && LABEL_PROFILES.some((p) => p.id === saved)) setProfileId(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function changeProfile(id: string) {
    setProfileId(id);
    try {
      localStorage.setItem("pakgold_label_profile", id);
    } catch {
      /* ignore */
    }
  }

  const profile = getLabelProfile(profileId);

  const toggle = (id: number) =>
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allSelected = sel.size === items.length && items.length > 0;
  const toggleAll = () => setSel(allSelected ? new Set() : new Set(items.map((i) => i.id)));

  const chosen = items.filter((i) => sel.has(i.id));
  const labels = chosen.flatMap((i) => Array.from({ length: Math.max(1, copies) }, () => i));

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="no-print flex flex-wrap items-center gap-3 bg-white rounded-2xl ring-1 ring-black/5 p-4">
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-500">Label profile</label>
          <select
            value={profileId}
            onChange={(e) => changeProfile(e.target.value)}
            className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
          >
            {LABEL_PROFILES.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button onClick={toggleAll} className="rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">
          {allSelected ? "Unselect all" : "Select all"}
        </button>
        <div className="flex items-center gap-2 text-sm">
          <label className="text-gray-500">Copies each</label>
          <input
            type="number"
            min={1}
            value={copies || ""}
            onChange={(e) => setCopies(Number(e.target.value))}
            className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 tnum"
          />
        </div>
        <span className="text-sm text-gray-500">{sel.size} selected → {labels.length} label(s)</span>
        <button
          onClick={() => window.print()}
          disabled={labels.length === 0}
          className="ml-auto flex items-center gap-2 rounded-lg bg-gold text-navy-900 font-semibold px-4 py-2 text-sm hover:brightness-105 disabled:opacity-50"
        >
          <Printer size={16} /> Print Labels
        </button>
      </div>

      <div className="no-print text-xs text-gray-400">
        {profile.kind === "tag" ? "Jewellery tag" : "Thermal label"} · {profile.widthMm} × {profile.heightMm} mm ·{" "}
        {profile.columns} per row
      </div>

      {/* Selectable item list */}
      <div className="no-print rounded-2xl bg-white ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2 w-10"></th>
              <th className="px-4 py-2">Barcode</th>
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2">Purity</th>
              <th className="px-4 py-2 text-right">Net Wt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((i) => (
              <tr key={i.id} className="hover:bg-gold-50/40 cursor-pointer" onClick={() => toggle(i.id)}>
                <td className="px-4 py-2"><input type="checkbox" checked={sel.has(i.id)} readOnly /></td>
                <td className="px-4 py-2 font-mono text-xs">{i.barcode}</td>
                <td className="px-4 py-2">{i.nameEn}</td>
                <td className="px-4 py-2">{i.karat}K</td>
                <td className="px-4 py-2 text-right tnum">{i.netWeight} g</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No items in stock.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Print area: grid of labels honouring the chosen profile */}
      <div id="print-area" className="bg-white">
        <div style={{ display: "flex", flexWrap: "wrap", gap: profile.kind === "tag" ? "2mm" : "4mm" }}>
          {labels.map((i, idx) => (
            <LabelTag key={`${i.id}-${idx}`} item={i} shopName={shopName} profile={profile} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LabelTag({ item, shopName, profile }: { item: Item; shopName: string; profile: LabelProfile }) {
  if (profile.kind === "tag") {
    // Dumbbell / butterfly jewellery tag: two flaps separated by the barcode bridge.
    return (
      <div
        style={{
          width: `${profile.widthMm}mm`,
          minHeight: `${profile.heightMm}mm`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1mm",
          border: "1px dashed #bbb",
          borderRadius: 2,
          padding: "0.5mm 1mm",
          breakInside: "avoid",
          fontSize: profile.fontPt,
        }}
      >
        <div style={{ lineHeight: 1.1, whiteSpace: "nowrap" }}>
          <div style={{ fontWeight: 700 }}>{item.barcode}</div>
          <div>{item.karat}K{profile.showWeight ? ` ${item.netWeight}g` : ""}</div>
        </div>
        <Barcode value={item.barcode} height={profile.barcodeHeight} moduleWidth={profile.moduleWidth} />
        <div style={{ lineHeight: 1.1, whiteSpace: "nowrap", textAlign: "right" }}>
          <div style={{ fontWeight: 700 }}>{item.karat}K</div>
          {profile.showWeight && <div>{item.netWeight}g</div>}
        </div>
      </div>
    );
  }

  // Rectangular sticker label.
  return (
    <div
      style={{
        width: `${profile.widthMm}mm`,
        minHeight: `${profile.heightMm}mm`,
        border: "1px solid #ddd",
        borderRadius: 4,
        padding: "1.5mm",
        textAlign: "center",
        breakInside: "avoid",
        fontSize: profile.fontPt,
      }}
    >
      {profile.showShop && <div style={{ fontWeight: 700 }}>{shopName}</div>}
      <div>
        {item.nameEn.slice(0, 22)} • {item.karat}K{profile.showWeight ? ` • ${item.netWeight}g` : ""}
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Barcode value={item.barcode} height={profile.barcodeHeight} moduleWidth={profile.moduleWidth} />
      </div>
    </div>
  );
}
