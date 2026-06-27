"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Gem } from "lucide-react";
import { createItem, updateItem, createCategory, type ItemInput, type StoneInput } from "@/lib/inventoryActions";
import {
  KARAT_PURITY,
  SILVER_PURITY_PRESETS,
  STONE_TYPES,
  STONE_SHAPES,
  HALLMARK_LABS,
  type MakingType,
  type WastageType,
} from "@/lib/constants";
import { Barcode } from "@/components/Barcode";

const KARATS = [24, 22, 21, 18];

interface Cat {
  id: number;
  nameEn: string;
}

type FormState = Omit<ItemInput, "stones"> & { barcode: string };

let stoneKey = 0;
type StoneRow = StoneInput & { _k: number };

function blankStone(): StoneRow {
  return {
    _k: ++stoneKey,
    stoneType: "diamond",
    shape: "round",
    count: 1,
    caratWeight: 0,
    colorGrade: "",
    clarityGrade: "",
    certLab: "",
    certNo: "",
    ratePerCarat: 0,
    value: 0,
    notes: "",
  };
}

export function ItemForm({
  categories,
  initial,
  itemId,
  suggestedBarcode,
  initialStones,
}: {
  categories: Cat[];
  initial?: Partial<FormState>;
  itemId?: number;
  suggestedBarcode: string;
  initialStones?: StoneInput[];
}) {
  const [cats, setCats] = useState(categories);
  const [newCat, setNewCat] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  const [f, setF] = useState<FormState>({
    barcode: initial?.barcode ?? suggestedBarcode,
    nameEn: initial?.nameEn ?? "",
    nameUr: initial?.nameUr ?? "",
    categoryId: initial?.categoryId ?? null,
    metal: (initial?.metal as "gold" | "silver") ?? "gold",
    karat: initial?.karat ?? 22,
    silverPurity: initial?.silverPurity ?? 925,
    grossWeight: initial?.grossWeight ?? 0,
    netWeight: initial?.netWeight ?? 0,
    makingType: (initial?.makingType as MakingType) ?? "per_gram",
    makingValue: initial?.makingValue ?? 0,
    wastageType: (initial?.wastageType as WastageType) ?? "charge_pct",
    wastageValue: initial?.wastageValue ?? 0,
    stonesValue: initial?.stonesValue ?? 0,
    otherCharges: initial?.otherCharges ?? 0,
    hallmark: initial?.hallmark ?? KARAT_PURITY[initial?.karat ?? 22]?.hallmark ?? "",
    hallmarkLab: initial?.hallmarkLab ?? "",
    certNo: initial?.certNo ?? "",
    certDate: initial?.certDate ?? "",
    costPrice: initial?.costPrice ?? 0,
    supplier: initial?.supplier ?? "",
    quantity: initial?.quantity ?? 1,
  });

  const [stones, setStones] = useState<StoneRow[]>(
    (initialStones ?? []).map((s) => ({ ...s, _k: ++stoneKey }))
  );

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  function setStone(k: number, patch: Partial<StoneRow>) {
    setStones((prev) =>
      prev.map((s) => {
        if (s._k !== k) return s;
        const next = { ...s, ...patch };
        // Auto-compute value when carat x rate are present.
        if (("caratWeight" in patch || "ratePerCarat" in patch) && next.ratePerCarat) {
          next.value = Math.round((next.caratWeight || 0) * (next.ratePerCarat || 0));
        }
        return next;
      })
    );
  }

  const stonesTotal = stones.reduce((s, r) => s + (Number(r.value) || 0), 0);

  function addCategory() {
    if (!newCat.trim()) return;
    start(async () => {
      const res = await createCategory(newCat);
      if (res.ok) {
        setCats((p) => [...p, res.category]);
        set("categoryId", res.category.id);
        setNewCat("");
      }
    });
  }

  function save() {
    setError("");
    const payload: ItemInput = {
      ...f,
      stonesValue: stones.length > 0 ? stonesTotal : f.stonesValue,
      stones: stones.map(({ _k, ...rest }) => rest),
    };
    start(async () => {
      const res = itemId ? await updateItem(itemId, payload) : await createItem(payload);
      if (!res.ok) return setError(res.error ?? "Failed to save");
      router.push("/inventory");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main details */}
        <div className="lg:col-span-2 rounded-2xl bg-white ring-1 ring-black/5 p-5 space-y-4">
          <h2 className="font-semibold">Item Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name (English) *" value={f.nameEn} onChange={(v) => set("nameEn", v)} />
            <Field label="Name (Urdu)" value={f.nameUr ?? ""} onChange={(v) => set("nameUr", v)} urdu />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Category</label>
              <select
                value={f.categoryId ?? ""}
                onChange={(e) => set("categoryId", e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">— none —</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.nameEn}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Add new category</label>
              <div className="flex gap-1">
                <input
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="e.g. Anklet"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
                <button onClick={addCategory} className="rounded-lg bg-gray-100 px-3 text-sm hover:bg-gray-200">
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Metal</label>
              <select
                value={f.metal ?? "gold"}
                onChange={(e) => {
                  const m = e.target.value as "gold" | "silver";
                  set("metal", m);
                  if (m === "silver") set("hallmark", String(f.silverPurity ?? 925));
                  else set("hallmark", KARAT_PURITY[f.karat]?.hallmark ?? "");
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="gold">Gold (سونا)</option>
                <option value="silver">Silver / Chandi (چاندی)</option>
              </select>
            </div>
            {f.metal === "silver" ? (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Purity (fineness)</label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={f.silverPurity ?? ""}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    set("silverPurity", p);
                    set("hallmark", String(p));
                  }}
                  placeholder="e.g. 925"
                  list="silver-purity-presets-inv"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tnum"
                />
                <datalist id="silver-purity-presets-inv">
                  {SILVER_PURITY_PRESETS.map((p) => (
                    <option key={p.fineness} value={p.fineness}>{p.label}</option>
                  ))}
                </datalist>
              </div>
            ) : (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Purity (Karat)</label>
                <select
                  value={f.karat}
                  onChange={(e) => {
                    const k = Number(e.target.value);
                    set("karat", k);
                    set("hallmark", KARAT_PURITY[k]?.hallmark ?? "");
                  }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  {KARATS.map((k) => (
                    <option key={k} value={k}>{k}K ({KARAT_PURITY[k].hallmark})</option>
                  ))}
                </select>
              </div>
            )}
            <Field label="Hallmark" value={f.hallmark ?? ""} onChange={(v) => set("hallmark", v)} />
            <NumField label="Gross Weight (g)" value={f.grossWeight} onChange={(v) => set("grossWeight", v)} />
            <NumField label="Net Weight (g)" value={f.netWeight} onChange={(v) => set("netWeight", v)} />
          </div>

          {/* Hallmark / purity certificate */}
          <h3 className="font-semibold pt-2 text-sm text-gray-700">Hallmark / Purity Certificate</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Assay / Hallmark Lab</label>
              <select
                value={f.hallmarkLab ?? ""}
                onChange={(e) => set("hallmarkLab", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="">— none —</option>
                {HALLMARK_LABS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <Field label="Certificate No." value={f.certNo ?? ""} onChange={(v) => set("certNo", v)} />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Certificate Date</label>
              <input
                type="date"
                value={f.certDate ?? ""}
                onChange={(e) => set("certDate", e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <h3 className="font-semibold pt-2 text-sm text-gray-700">Charges</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Making Type</label>
              <select
                value={f.makingType}
                onChange={(e) => set("makingType", e.target.value as MakingType)}
                className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
              >
                <option value="per_gram">Per gram</option>
                <option value="fixed">Fixed</option>
                <option value="percent">% of gold</option>
              </select>
            </div>
            <NumField label="Making Value" value={f.makingValue} onChange={(v) => set("makingValue", v)} />
            <div>
              <label className="block text-xs text-gray-500 mb-1">Wastage Type</label>
              <select
                value={f.wastageType}
                onChange={(e) => set("wastageType", e.target.value as WastageType)}
                className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm"
              >
                <option value="charge_pct">% charge</option>
                <option value="weight_pct">% weight</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
            <NumField label="Wastage Value" value={f.wastageValue} onChange={(v) => set("wastageValue", v)} />
            <NumField
              label="Stones Value"
              value={stones.length > 0 ? stonesTotal : f.stonesValue ?? 0}
              onChange={(v) => set("stonesValue", v)}
              disabled={stones.length > 0}
            />
            <NumField label="Other Charges" value={f.otherCharges ?? 0} onChange={(v) => set("otherCharges", v)} />
            <NumField label="Quantity" value={f.quantity ?? 1} onChange={(v) => set("quantity", v)} />
          </div>

          {/* Stone & diamond detail */}
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
                <Gem size={15} className="text-gold-600" /> Stone &amp; Diamond Detail
              </h3>
              <button
                type="button"
                onClick={() => setStones((p) => [...p, blankStone()])}
                className="flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200"
              >
                <Plus size={13} /> Add stone
              </button>
            </div>
            {stones.length === 0 ? (
              <p className="text-xs text-gray-400 mt-2">
                Optional — itemise diamonds/stones with carat, grade &amp; certificate for higher-end pieces.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {stones.map((s) => (
                  <div key={s._k} className="rounded-xl border border-gray-200 p-3 space-y-2 bg-gray-50/60">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <SmallSelect
                        label="Type"
                        value={s.stoneType}
                        onChange={(v) => setStone(s._k, { stoneType: v })}
                        options={STONE_TYPES as readonly string[]}
                      />
                      <SmallSelect
                        label="Shape"
                        value={s.shape ?? ""}
                        onChange={(v) => setStone(s._k, { shape: v })}
                        options={STONE_SHAPES as readonly string[]}
                      />
                      <SmallNum label="Count" value={s.count} onChange={(v) => setStone(s._k, { count: v })} />
                      <SmallNum
                        label="Carats (total)"
                        value={s.caratWeight}
                        onChange={(v) => setStone(s._k, { caratWeight: v })}
                        step="0.001"
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <SmallField label="Colour" value={s.colorGrade ?? ""} onChange={(v) => setStone(s._k, { colorGrade: v })} />
                      <SmallField label="Clarity" value={s.clarityGrade ?? ""} onChange={(v) => setStone(s._k, { clarityGrade: v })} />
                      <SmallNum
                        label="Rate / carat"
                        value={s.ratePerCarat ?? 0}
                        onChange={(v) => setStone(s._k, { ratePerCarat: v })}
                      />
                      <SmallNum label="Value (Rs)" value={s.value} onChange={(v) => setStone(s._k, { value: v })} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                      <SmallField label="Cert Lab" value={s.certLab ?? ""} onChange={(v) => setStone(s._k, { certLab: v })} />
                      <SmallField label="Cert No." value={s.certNo ?? ""} onChange={(v) => setStone(s._k, { certNo: v })} />
                      <SmallField label="Notes" value={s.notes ?? ""} onChange={(v) => setStone(s._k, { notes: v })} />
                      <button
                        type="button"
                        onClick={() => setStones((p) => p.filter((x) => x._k !== s._k))}
                        className="flex items-center justify-center gap-1 rounded-lg bg-red-50 text-red-600 px-3 py-2 text-xs hover:bg-red-100"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end text-sm font-semibold text-navy-900">
                  Stones total: Rs {stonesTotal.toLocaleString("en-PK")}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: stock/cost + barcode */}
        <div className="space-y-5">
          <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5 space-y-3">
            <h2 className="font-semibold">Stock &amp; Cost</h2>
            <Field label="Barcode / SKU" value={f.barcode} onChange={(v) => set("barcode", v)} />
            <NumField label="Cost Price (Rs)" value={f.costPrice ?? 0} onChange={(v) => set("costPrice", v)} />
            <Field label="Supplier" value={f.supplier ?? ""} onChange={(v) => set("supplier", v)} />
          </div>
          <div className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
            <h2 className="font-semibold mb-3">Label Preview</h2>
            <div className="flex justify-center bg-gray-50 rounded-lg p-3">
              <Barcode value={f.barcode || "PG00000"} />
            </div>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 text-red-600 text-sm px-3 py-2">{error}</div>}
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-gold text-navy-900 font-semibold px-6 py-2.5 hover:brightness-105 disabled:opacity-60"
        >
          {pending ? "Saving…" : itemId ? "Update Item" : "Add Item"}
        </button>
        <button onClick={() => router.back()} className="rounded-lg px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100">
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  urdu,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  urdu?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={urdu ? "rtl" : "ltr"}
        className={`w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gold ${urdu ? "urdu" : ""}`}
      />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tnum outline-none focus:border-gold disabled:bg-gray-100 disabled:text-gray-400"
      />
    </div>
  );
}

function SmallField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-gold"
      />
    </div>
  );
}

function SmallNum({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">{label}</label>
      <input
        type="number"
        step={step}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs tnum outline-none focus:border-gold"
      />
    </div>
  );
}

function SmallSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs capitalize outline-none focus:border-gold"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
