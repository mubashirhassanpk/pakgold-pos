"use client";

import { useMemo, useState, useTransition, useEffect, useRef } from "react";
import { Plus, Trash2, Search, Printer, Scale, User, X, PauseCircle, ListChecks, FileText } from "lucide-react";
import {
  computeLineItem,
  computeInvoiceTotals,
  computeOldGoldValue,
  type TaxRule,
} from "@/lib/calculations";
import { toGrams } from "@/lib/units";
import {
  KARAT_PURITY,
  SILVER_PURITY_PRESETS,
  silverPurityFactor,
  type WeightUnit,
  type MakingType,
  type WastageType,
  type Metal,
} from "@/lib/constants";
import { formatPKR, formatWeightDual, formatDateTime } from "@/lib/format";
import { createSale, type CreateSalePayload } from "@/lib/actions";
import { createCustomer } from "@/lib/customerActions";
import { holdBill, recallBill, deleteHeldBill } from "@/lib/holdActions";
import type { CurrentRate, CurrentSilverRate } from "@/lib/queries";
import type { CartLine, OldGoldRow, PickCustomer, HeldBillSummary } from "@/lib/posTypes";
import { Receipt } from "./Receipt";

const KARATS = [24, 22, 21, 18];
const SILVER_FINENESS = SILVER_PURITY_PRESETS.map((p) => p.fineness);

interface InvItem {
  id: number;
  barcode: string;
  nameEn: string;
  nameUr: string;
  metal: Metal;
  karat: number;
  silverPurity: number | null;
  netWeight: number;
  makingType: MakingType;
  makingValue: number;
  wastageType: WastageType;
  wastageValue: number;
  otherCharges: number;
  quantity: number;
}

const uid = () => Math.random().toString(36).slice(2, 9);

export function PosClient({
  rates,
  silverRates,
  inventory,
  customers,
  heldBills,
  taxRule,
  settings,
}: {
  rates: CurrentRate[];
  silverRates: CurrentSilverRate[];
  inventory: InvItem[];
  customers: PickCustomer[];
  heldBills: HeldBillSummary[];
  taxRule: TaxRule & { name?: string } | null;
  settings: Record<string, string>;
}) {
  const sellRate = (karat: number) => rates.find((r) => r.karat === karat)?.sellPerTola ?? 0;
  const buyRate = (karat: number) => rates.find((r) => r.karat === karat)?.buyPerTola ?? 0;

  // --- Silver (chandi) rate resolution -------------------------------------
  // The shop quotes silver per fineness. If the exact fineness isn't on file we
  // derive it from the purest available row scaled by the purity factor, so any
  // typed purity still gets a sensible rate.
  const pureSilver = silverRates.find((r) => r.fineness === 999) ?? silverRates[0] ?? null;
  function silverSellPerTola(fineness: number): number {
    const exact = silverRates.find((r) => r.fineness === fineness);
    if (exact) return exact.sellPerTola;
    if (!pureSilver) return 0;
    // Scale the pure (999) rate down to the requested fineness.
    return Math.round((pureSilver.sellPerTola / pureSilver.purityFactor) * silverPurityFactor(fineness));
  }
  function silverBuyPerTola(fineness: number): number {
    const exact = silverRates.find((r) => r.fineness === fineness);
    if (exact) return exact.buyPerTola;
    if (!pureSilver) return 0;
    return Math.round((pureSilver.buyPerTola / pureSilver.purityFactor) * silverPurityFactor(fineness));
  }
  const haveSilver = silverRates.length > 0;

  const [lines, setLines] = useState<CartLine[]>([]);
  const [oldGold, setOldGold] = useState<OldGoldRow[]>([]);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState("cash");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<{ invoiceNo: string; saleId: number } | null>(null);

  // Customer selection (udhaar) + amount received
  const [customerList, setCustomerList] = useState<PickCustomer[]>(customers);
  const [customer, setCustomer] = useState<PickCustomer | null>(null);
  const [custSearch, setCustSearch] = useState("");
  const [received, setReceived] = useState<number | null>(null); // null = pay full

  // Hold & Recall
  const [held, setHeld] = useState<HeldBillSummary[]>(heldBills);
  const [showRecall, setShowRecall] = useState(false);

  // --- Custom sale form (gold or silver) ---
  const [cf, setCf] = useState({
    description: "",
    metal: "gold" as Metal,
    karat: 22,
    silverPurity: 925,
    weight: 0,
    unit: "gram" as WeightUnit,
    makingType: "per_gram" as MakingType,
    makingValue: 0,
    wastageType: "charge_pct" as WastageType,
    wastageValue: 2,
    other: 0,
  });

  // --- Old metal (gold/silver) buyback form ---
  const [og, setOg] = useState({
    metal: "gold" as Metal,
    weight: 0,
    unit: "gram" as WeightUnit,
    karat: 22,
    silverPurity: 925,
    notes: "",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inventory.slice(0, 8);
    return inventory
      .filter(
        (i) =>
          i.nameEn.toLowerCase().includes(q) ||
          i.barcode.toLowerCase().includes(q) ||
          i.nameUr.includes(search.trim())
      )
      .slice(0, 12);
  }, [search, inventory]);

  // Keyboard navigation for the item search results (↑/↓ to move, Enter to add).
  const [activeItemIdx, setActiveItemIdx] = useState(0);
  useEffect(() => setActiveItemIdx(0), [search]);
  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveItemIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveItemIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = filtered[activeItemIdx];
      if (it && it.quantity - cartQtyFor(it.id) > 0) addInventory(it);
    }
  }

  // --- Compute results for each line ---
  const computedLines = lines.map((l) => ({
    line: l,
    result: computeLineItem({
      weightGrams: l.weightGrams,
      ratePerTola: l.ratePerTola,
      makingType: l.makingType,
      makingValue: l.makingValue,
      wastageType: l.wastageType,
      wastageValue: l.wastageValue,
      otherCharges: l.other,
      quantity: l.quantity,
    }),
  }));

  const totals = useMemo(
    () =>
      computeInvoiceTotals({
        lines: computedLines.map((c) => c.result),
        oldGold: oldGold.map((g) => ({ weightGrams: g.weightGrams, buyRatePerTola: g.buyRatePerTola })),
        taxRule,
        discount,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, oldGold, discount, taxRule]
  );

  // How many pieces of an inventory item are already in the cart.
  const cartQtyFor = (itemId: number) =>
    lines.reduce((n, l) => (l.itemId === itemId ? n + l.quantity : n), 0);

  // --- Actions ---
  function addInventory(item: InvItem) {
    // Respect available stock — a piece can't be billed more times than it
    // exists. Adding the same item again bumps the existing line's quantity
    // instead of creating a duplicate line.
    const already = cartQtyFor(item.id);
    if (already >= item.quantity) {
      alert(`Only ${item.quantity} in stock for "${item.nameEn}".`);
      return;
    }
    const existing = lines.find((l) => l.itemId === item.id);
    if (existing) {
      setLines((prev) =>
        prev.map((l) => (l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l))
      );
      setSearch("");
      return;
    }
    const isSilver = item.metal === "silver";
    const rate = isSilver
      ? silverSellPerTola(item.silverPurity ?? 999)
      : sellRate(item.karat);
    setLines((prev) => [
      ...prev,
      {
        key: uid(),
        itemId: item.id,
        type: "item",
        description: item.nameEn,
        metal: item.metal,
        karat: item.karat,
        silverPurity: isSilver ? item.silverPurity ?? 999 : null,
        weightGrams: item.netWeight,
        ratePerTola: rate,
        makingType: item.makingType,
        makingValue: item.makingValue,
        wastageType: item.wastageType,
        wastageValue: item.wastageValue,
        other: item.otherCharges,
        quantity: 1,
      },
    ]);
    setSearch("");
  }

  function addCustom() {
    const grams = toGrams(cf.weight, cf.unit);
    if (grams <= 0) return;
    const isSilver = cf.metal === "silver";
    const rate = isSilver ? silverSellPerTola(cf.silverPurity) : sellRate(cf.karat);
    const label = isSilver
      ? cf.description || `Custom ${cf.silverPurity} Silver`
      : cf.description || `Custom ${cf.karat}K Gold`;
    setLines((prev) => [
      ...prev,
      {
        key: uid(),
        itemId: null,
        type: "custom",
        description: label,
        metal: cf.metal,
        karat: cf.karat,
        silverPurity: isSilver ? cf.silverPurity : null,
        weightGrams: grams,
        ratePerTola: rate,
        makingType: cf.makingType,
        makingValue: cf.makingValue,
        wastageType: cf.wastageType,
        wastageValue: cf.wastageValue,
        other: cf.other,
        quantity: 1,
      },
    ]);
    setCf((c) => ({ ...c, description: "", weight: 0, makingValue: 0, other: 0 }));
  }

  function addOldGold() {
    const grams = toGrams(og.weight, og.unit);
    if (grams <= 0) return;
    const isSilver = og.metal === "silver";
    const rate = isSilver ? silverBuyPerTola(og.silverPurity) : buyRate(og.karat);
    setOldGold((prev) => [
      ...prev,
      {
        key: uid(),
        metal: og.metal,
        weightGrams: grams,
        karat: og.karat,
        silverPurity: isSilver ? og.silverPurity : null,
        buyRatePerTola: rate,
        notes: og.notes,
      },
    ]);
    setOg((o) => ({ ...o, weight: 0, notes: "" }));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }
  // Adjust a line's piece quantity. Item lines are capped at the stock on hand;
  // dropping to zero removes the line.
  function changeQty(key: string, delta: number) {
    setLines((prev) =>
      prev.flatMap((l) => {
        if (l.key !== key) return [l];
        const next = l.quantity + delta;
        if (next <= 0) return [];
        const stock = l.itemId != null ? inventory.find((i) => i.id === l.itemId)?.quantity ?? next : Infinity;
        return [{ ...l, quantity: Math.min(next, stock) }];
      })
    );
  }
  function removeOldGold(key: string) {
    setOldGold((prev) => prev.filter((l) => l.key !== key));
  }

  const filteredCustomers = useMemo(() => {
    const q = custSearch.trim().toLowerCase();
    if (!q) return [];
    return customerList
      .filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(custSearch.trim()))
      .slice(0, 6);
  }, [custSearch, customerList]);

  // ↑/↓ + Enter through the customer match list (Enter on empty list = add new).
  const [activeCustIdx, setActiveCustIdx] = useState(0);
  useEffect(() => setActiveCustIdx(0), [custSearch]);
  function onCustKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!custSearch.trim()) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveCustIdx((i) => Math.min(i + 1, Math.max(0, filteredCustomers.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveCustIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = filteredCustomers[activeCustIdx];
      if (c) {
        setCustomer(c);
        setCustSearch("");
      } else {
        quickAddCustomer();
      }
    }
  }

  function quickAddCustomer() {
    const name = custSearch.trim();
    if (!name) return;
    startTransition(async () => {
      const res = await createCustomer({ name });
      if (res.ok) {
        const c: PickCustomer = { id: res.customer.id, name: res.customer.name, phone: res.customer.phone, balance: res.customer.balance };
        setCustomerList((prev) => [c, ...prev]);
        setCustomer(c);
        setCustSearch("");
      }
    });
  }

  // Amount the customer actually pays now; null means pay the full grand total.
  const payNow = received === null ? totals.grandTotal : received;
  const udhaar = Math.max(0, Math.round((totals.grandTotal - payNow) * 100) / 100);

  function save() {
    if (lines.length === 0) return;
    if (udhaar > 0 && !customer) {
      alert("Select a customer to record the remaining balance as udhaar.");
      return;
    }
    const payload: CreateSalePayload = {
      customerId: customer?.id ?? null,
      lines: computedLines.map((c) => ({
        itemId: c.line.itemId,
        type: c.line.type,
        description: c.line.description,
        metal: c.line.metal,
        karat: c.line.karat,
        silverPurity: c.line.silverPurity,
        weightGrams: c.line.weightGrams,
        ratePerTola: c.line.ratePerTola,
        goldValue: c.result.goldValue,
        making: c.result.making,
        wastage: c.result.wastage,
        other: c.result.other,
        quantity: c.result.quantity,
        lineTotal: c.result.lineTotal,
      })),
      oldGold: oldGold.map((g) => ({
        metal: g.metal,
        weightGrams: g.weightGrams,
        karat: g.karat,
        silverPurity: g.silverPurity,
        buyRatePerTola: g.buyRatePerTola,
        value: computeOldGoldValue(g.weightGrams, g.buyRatePerTola),
        notes: g.notes,
      })),
      payments: payNow > 0 ? [{ method, amount: payNow }] : [],
      totals: {
        goldValueTotal: totals.goldValueTotal,
        makingTotal: totals.makingTotal,
        wastageTotal: totals.wastageTotal,
        otherTotal: totals.otherTotal,
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        oldGoldTotal: totals.oldGoldTotal,
        grandTotal: totals.grandTotal,
      },
    };
    startTransition(async () => {
      const res = await createSale(payload);
      if (res.ok) setDone({ invoiceNo: res.invoiceNo, saleId: res.saleId });
    });
  }

  function clearCart() {
    setLines([]);
    setOldGold([]);
    setDiscount(0);
    setCustomer(null);
    setCustSearch("");
    setReceived(null);
  }

  function newSale() {
    clearCart();
    setDone(null);
  }

  // --- Hold & Recall ---
  function holdCurrent() {
    if (lines.length === 0 && oldGold.length === 0) return;
    const label = customer?.name || `Bill ${formatDateTime(Date.now())}`;
    startTransition(async () => {
      const res = await holdBill(label, { customer, lines, oldGold, discount, method, received });
      if (res.ok) {
        setHeld((prev) => [res.bill, ...prev]);
        clearCart();
      }
    });
  }

  function recall(id: number) {
    startTransition(async () => {
      const res = await recallBill(id);
      if (res.ok) {
        // Older held bills predate silver support — backfill metal/purity so
        // recalled lines behave like gold rather than carrying undefined.
        setLines(
          res.payload.lines.map((l) => ({
            ...l,
            metal: l.metal ?? "gold",
            silverPurity: l.silverPurity ?? null,
          }))
        );
        setOldGold(
          res.payload.oldGold.map((g) => ({
            ...g,
            metal: g.metal ?? "gold",
            silverPurity: g.silverPurity ?? null,
          }))
        );
        setDiscount(res.payload.discount);
        setCustomer(res.payload.customer);
        setMethod(res.payload.method);
        setReceived(res.payload.received);
        setHeld((prev) => prev.filter((b) => b.id !== id));
        setShowRecall(false);
      }
    });
  }

  function removeHeld(id: number) {
    startTransition(async () => {
      await deleteHeldBill(id);
      setHeld((prev) => prev.filter((b) => b.id !== id));
    });
  }

  // --- Hardware: read weight from the scale into a weight field ---
  const [scaleBusy, setScaleBusy] = useState(false);
  async function getFromScale(target: "custom" | "oldgold") {
    setScaleBusy(true);
    try {
      const res = await fetch("/api/scale");
      const data = await res.json();
      if (!data.ok) {
        alert(`Scale error: ${data.error}`);
        return;
      }
      if (target === "custom") setCf((c) => ({ ...c, weight: data.grams, unit: "gram" }));
      else setOg((o) => ({ ...o, weight: data.grams, unit: "gram" }));
    } catch {
      alert("Could not reach the scale. Check Settings → Hardware.");
    } finally {
      setScaleBusy(false);
    }
  }

  async function printThermal(saleId: number) {
    try {
      const res = await fetch(`/api/print/${saleId}`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) alert(`Print: ${data.error}`);
    } catch {
      alert("Could not reach the printer. Check Settings → Hardware.");
    }
  }

  // --- Keyboard shortcuts (fast billing) ---
  // Ref holds the latest handlers so the one-time listener always sees current state.
  const shortcutMap = {
    done,
    canSave: lines.length > 0,
    canHold: lines.length > 0 || oldGold.length > 0,
    save,
    newSale,
    holdCurrent,
    openRecall: () => setShowRecall(true),
    closeRecall: () => setShowRecall(false),
    scale: () => getFromScale("custom"),
  };
  const mapRef = useRef(shortcutMap);
  mapRef.current = shortcutMap;

  useEffect(() => {
    const focusId = (id: string) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) { el.focus(); el.select?.(); }
    };
    const onKey = (e: KeyboardEvent) => {
      const m = mapRef.current;
      switch (e.key) {
        case "F1": // focus item search
          e.preventDefault();
          if (!m.done) focusId("pos-search");
          break;
        case "F2": // complete sale / new sale
          e.preventDefault();
          if (m.done) m.newSale();
          else if (m.canSave) m.save();
          break;
        case "F3": // recall held bill
          e.preventDefault();
          if (!m.done) m.openRecall();
          break;
        case "F4": // hold current bill
          e.preventDefault();
          if (!m.done && m.canHold) m.holdCurrent();
          break;
        case "F6": // get weight from scale
          e.preventDefault();
          if (!m.done) m.scale();
          break;
        case "F7": // focus discount
          e.preventDefault();
          if (!m.done) focusId("pos-discount");
          break;
        case "F9": // focus customer search
          e.preventDefault();
          if (!m.done) focusId("pos-customer");
          break;
        case "Escape":
          m.closeRecall();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // --- Receipt view after save ---
  if (done) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="no-print flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-success">✓ Sale saved — {done.invoiceNo}</h1>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg bg-navy-900 text-white px-4 py-2"
            >
              <Printer size={16} /> Print Receipt
            </button>
            <button
              onClick={() => printThermal(done.saleId)}
              className="flex items-center gap-2 rounded-lg border border-navy-900 text-navy-900 px-4 py-2 font-medium hover:bg-navy-50"
            >
              <Printer size={16} /> Thermal
            </button>
            <a
              href={`/invoice/${done.saleId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-navy-900 text-navy-900 px-4 py-2 font-medium hover:bg-navy-50"
            >
              <FileText size={16} /> A4 Invoice
            </a>
            <button onClick={newSale} className="rounded-lg bg-gold text-navy-900 font-semibold px-4 py-2">
              New Sale (F2)
            </button>
          </div>
        </div>
        <div id="print-area" className="mx-auto bg-white p-4 ring-1 ring-black/10" style={{ width: "80mm" }}>
          <Receipt
            settings={settings}
            invoiceNo={done.invoiceNo}
            lines={computedLines}
            oldGold={oldGold}
            totals={totals}
            method={method}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 h-screen overflow-hidden">
      {/* LEFT: item entry */}
      <div className="lg:col-span-2 space-y-4 overflow-y-auto pr-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">New Sale <span className="urdu text-base text-gray-400">نئی فروخت</span></h1>
          <div className="flex gap-2">
            <button
              onClick={holdCurrent}
              disabled={pending || (lines.length === 0 && oldGold.length === 0)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              <PauseCircle size={16} /> Hold <kbd className="text-[10px] text-gray-400">F4</kbd>
            </button>
            <button
              onClick={() => setShowRecall(true)}
              className="relative flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <ListChecks size={16} /> Recall <kbd className="text-[10px] text-gray-400">F3</kbd>
              {held.length > 0 && (
                <span className="ml-0.5 rounded-full bg-gold text-navy-900 text-[10px] font-bold px-1.5 py-0.5">
                  {held.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search inventory */}
        <div className="rounded-2xl bg-white ring-1 ring-black/5 p-4">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <Search size={18} className="text-gray-400" />
            <input
              id="pos-search"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onSearchKey}
              placeholder="Search item by name / barcode… (F1, ↑/↓ + Enter)"
              className="flex-1 outline-none text-sm"
            />
          </div>
          {filtered.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {filtered.map((it, idx) => {
                const remaining = it.quantity - cartQtyFor(it.id);
                const out = remaining <= 0;
                const active = idx === activeItemIdx;
                return (
                <button
                  key={it.id}
                  onClick={() => addInventory(it)}
                  onMouseEnter={() => setActiveItemIdx(idx)}
                  disabled={out}
                  className={`text-left rounded-lg border p-2.5 disabled:opacity-40 disabled:hover:border-gray-100 disabled:hover:bg-transparent disabled:cursor-not-allowed ${active ? "border-gold bg-gold-50/50 ring-1 ring-gold" : "border-gray-100 hover:border-gold hover:bg-gold-50/50"}`}
                >
                  <div className="text-sm font-medium flex items-center justify-between">
                    {it.nameEn}
                    <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${it.metal === "silver" ? "bg-slate-200 text-slate-700" : "bg-gold-100 text-gold-700"}`}>{it.metal === "silver" ? (it.silverPurity ?? 999) : `${it.karat}K`}</span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono flex items-center justify-between">
                    <span>{it.barcode} • {it.netWeight} g</span>
                    <span className={out ? "text-red-500 font-semibold" : "text-gray-500"}>
                      {out ? "Out of stock" : `${remaining} in stock`}
                    </span>
                  </div>
                </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Custom gold / silver sale */}
        <div className="rounded-2xl bg-white ring-1 ring-black/5 p-4">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
            <Scale size={16} /> Custom {cf.metal === "silver" ? "Silver" : "Gold"} Sale{" "}
            <span className="urdu text-gray-400">
              {cf.metal === "silver" ? "چاندی وزن سے" : "وزن سے فروخت"}
            </span>
            {/* Metal toggle */}
            <div className="ml-2 inline-flex rounded-lg ring-1 ring-gray-200 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setCf({ ...cf, metal: "gold" })}
                className={`px-2.5 py-1 font-medium ${cf.metal === "gold" ? "bg-gold text-navy-900" : "bg-white text-gray-500"}`}
              >
                Gold
              </button>
              <button
                type="button"
                onClick={() => setCf({ ...cf, metal: "silver" })}
                className={`px-2.5 py-1 font-medium ${cf.metal === "silver" ? "bg-slate-400 text-white" : "bg-white text-gray-500"}`}
              >
                Silver
              </button>
            </div>
            <button
              onClick={() => getFromScale("custom")}
              disabled={scaleBusy}
              className="ml-auto flex items-center gap-1 rounded-lg bg-navy-900 text-white text-xs font-medium px-2.5 py-1 hover:bg-navy-800 disabled:opacity-60"
            >
              <Scale size={13} /> {scaleBusy ? "Reading…" : "Get from Scale"}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input
              className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="Description (e.g. 22K Bangle)"
              value={cf.description}
              onChange={(e) => setCf({ ...cf, description: e.target.value })}
            />
            {cf.metal === "gold" ? (
              <select
                className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
                value={cf.karat}
                onChange={(e) => setCf({ ...cf, karat: Number(e.target.value) })}
              >
                {KARATS.map((k) => (
                  <option key={k} value={k}>{k}K ({KARAT_PURITY[k].hallmark})</option>
                ))}
              </select>
            ) : (
              <div className="flex gap-1">
                <input
                  type="number"
                  min={0}
                  max={1000}
                  className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm tnum"
                  placeholder="Purity (e.g. 925)"
                  value={cf.silverPurity || ""}
                  onChange={(e) => setCf({ ...cf, silverPurity: Number(e.target.value) })}
                  list="silver-purity-presets"
                />
                <datalist id="silver-purity-presets">
                  {SILVER_PURITY_PRESETS.map((p) => (
                    <option key={p.fineness} value={p.fineness}>{p.label}</option>
                  ))}
                </datalist>
              </div>
            )}
            <div className="flex gap-1">
              <input
                type="number"
                className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm tnum"
                placeholder="Weight"
                value={cf.weight || ""}
                onChange={(e) => setCf({ ...cf, weight: Number(e.target.value) })}
              />
              <select
                className="rounded-lg border border-gray-200 px-1 text-xs"
                value={cf.unit}
                onChange={(e) => setCf({ ...cf, unit: e.target.value as WeightUnit })}
              >
                <option value="gram">g</option>
                <option value="tola">tola</option>
                <option value="masha">masha</option>
                {cf.metal === "silver" && <option value="kg">kg</option>}
              </select>
            </div>
            <select
              className="rounded-lg border border-gray-200 px-2 py-2 text-xs"
              value={cf.makingType}
              onChange={(e) => setCf({ ...cf, makingType: e.target.value as MakingType })}
            >
              <option value="per_gram">Making /g</option>
              <option value="fixed">Making fixed</option>
              <option value="percent">Making %</option>
            </select>
            <input
              type="number"
              className="rounded-lg border border-gray-200 px-2 py-2 text-sm tnum"
              placeholder="Making"
              value={cf.makingValue || ""}
              onChange={(e) => setCf({ ...cf, makingValue: Number(e.target.value) })}
            />
            <select
              className="rounded-lg border border-gray-200 px-2 py-2 text-xs"
              value={cf.wastageType}
              onChange={(e) => setCf({ ...cf, wastageType: e.target.value as WastageType })}
            >
              <option value="charge_pct">Wastage % chg</option>
              <option value="weight_pct">Wastage % wt</option>
              <option value="fixed">Wastage fixed</option>
            </select>
            <input
              type="number"
              className="rounded-lg border border-gray-200 px-2 py-2 text-sm tnum"
              placeholder="Wastage"
              value={cf.wastageValue || ""}
              onChange={(e) => setCf({ ...cf, wastageValue: Number(e.target.value) })}
            />
            <input
              type="number"
              className="rounded-lg border border-gray-200 px-2 py-2 text-sm tnum"
              placeholder="Polish/Stone"
              value={cf.other || ""}
              onChange={(e) => setCf({ ...cf, other: Number(e.target.value) })}
            />
            <button
              onClick={addCustom}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1 rounded-lg bg-navy-900 text-white text-sm py-2 hover:bg-navy-800"
            >
              <Plus size={16} /> Add
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {cf.metal === "gold" ? (
              <>Rate auto-applied: {cf.karat}K @ {formatPKR(sellRate(cf.karat))}/tola</>
            ) : haveSilver ? (
              <>Silver rate: {cf.silverPurity || 999} @ {formatPKR(silverSellPerTola(cf.silverPurity))}/tola</>
            ) : (
              <span className="text-red-500">No silver rate set — add one on the Rates page.</span>
            )}
          </p>
        </div>

        {/* Old gold exchange */}
        <div className="rounded-2xl bg-white ring-1 ring-black/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            Old {og.metal === "silver" ? "Silver" : "Gold"} Exchange / Buyback{" "}
            <span className="urdu text-gray-400">{og.metal === "silver" ? "پرانی چاندی" : "پرانا سونا"}</span>
            <div className="ml-2 inline-flex rounded-lg ring-1 ring-gray-200 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setOg({ ...og, metal: "gold" })}
                className={`px-2.5 py-1 font-medium ${og.metal === "gold" ? "bg-gold text-navy-900" : "bg-white text-gray-500"}`}
              >
                Gold
              </button>
              <button
                type="button"
                onClick={() => setOg({ ...og, metal: "silver" })}
                className={`px-2.5 py-1 font-medium ${og.metal === "silver" ? "bg-slate-400 text-white" : "bg-white text-gray-500"}`}
              >
                Silver
              </button>
            </div>
            <button
              onClick={() => getFromScale("oldgold")}
              disabled={scaleBusy}
              className="ml-auto flex items-center gap-1 rounded-lg bg-navy-900 text-white text-xs font-medium px-2.5 py-1 hover:bg-navy-800 disabled:opacity-60"
            >
              <Scale size={13} /> {scaleBusy ? "Reading…" : "Get from Scale"}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="flex gap-1 col-span-2 sm:col-span-1">
              <input
                type="number"
                className="w-full rounded-lg border border-gray-200 px-2 py-2 text-sm tnum"
                placeholder="Weight"
                value={og.weight || ""}
                onChange={(e) => setOg({ ...og, weight: Number(e.target.value) })}
              />
              <select
                className="rounded-lg border border-gray-200 px-1 text-xs"
                value={og.unit}
                onChange={(e) => setOg({ ...og, unit: e.target.value as WeightUnit })}
              >
                <option value="gram">g</option>
                <option value="tola">tola</option>
                <option value="masha">masha</option>
                {og.metal === "silver" && <option value="kg">kg</option>}
              </select>
            </div>
            {og.metal === "gold" ? (
              <select
                className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
                value={og.karat}
                onChange={(e) => setOg({ ...og, karat: Number(e.target.value) })}
              >
                {KARATS.map((k) => (
                  <option key={k} value={k}>{k}K</option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                min={0}
                max={1000}
                className="rounded-lg border border-gray-200 px-2 py-2 text-sm tnum"
                placeholder="Purity (e.g. 925)"
                value={og.silverPurity || ""}
                onChange={(e) => setOg({ ...og, silverPurity: Number(e.target.value) })}
                list="silver-purity-presets"
              />
            )}
            <input
              className="col-span-2 rounded-lg border border-gray-200 px-2 py-2 text-sm"
              placeholder="Touch / purity notes"
              value={og.notes}
              onChange={(e) => setOg({ ...og, notes: e.target.value })}
            />
            <button
              onClick={addOldGold}
              className="rounded-lg bg-gold-100 text-gold-700 font-semibold text-sm py-2 hover:bg-gold-200"
            >
              Deduct
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {og.metal === "gold" ? (
              <>Buyback rate: {og.karat}K @ {formatPKR(buyRate(og.karat))}/tola</>
            ) : haveSilver ? (
              <>Silver buyback: {og.silverPurity || 999} @ {formatPKR(silverBuyPerTola(og.silverPurity))}/tola</>
            ) : (
              <span className="text-red-500">No silver rate set — add one on the Rates page.</span>
            )}
          </p>
        </div>
      </div>

      {/* RIGHT: cart + totals */}
      <div className="rounded-2xl bg-white ring-1 ring-black/5 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold">Bill</div>

        {/* Customer picker */}
        <div className="px-4 py-3 border-b border-gray-100">
          {customer ? (
            <div className="flex items-center justify-between rounded-lg bg-gold-50 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <User size={15} className="text-gold-700" />
                <span className="font-medium">{customer.name}</span>
                {customer.balance > 0 && (
                  <span className="text-xs text-red-600">({formatPKR(customer.balance)} due)</span>
                )}
              </div>
              <button onClick={() => setCustomer(null)} className="text-gray-400 hover:text-red-500">
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                <User size={15} className="text-gray-400" />
                <input
                  id="pos-customer"
                  value={custSearch}
                  onChange={(e) => setCustSearch(e.target.value)}
                  onKeyDown={onCustKey}
                  placeholder="Walk-in — search or add customer… (F9)"
                  className="flex-1 outline-none text-sm"
                />
              </div>
              {custSearch.trim() && (
                <div className="absolute z-10 left-0 right-0 mt-1 rounded-lg border border-gray-100 bg-white shadow-lg">
                  {filteredCustomers.map((c, idx) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCustomer(c);
                        setCustSearch("");
                      }}
                      onMouseEnter={() => setActiveCustIdx(idx)}
                      className={`w-full text-left px-3 py-2 text-sm flex justify-between ${idx === activeCustIdx ? "bg-gold-50" : "hover:bg-gold-50"}`}
                    >
                      <span>{c.name}</span>
                      <span className="text-xs text-gray-400">{c.phone}</span>
                    </button>
                  ))}
                  <button
                    onClick={quickAddCustomer}
                    className="w-full text-left px-3 py-2 text-sm text-gold-700 font-medium hover:bg-gold-50 border-t border-gray-100"
                  >
                    + Add &quot;{custSearch.trim()}&quot; as new customer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {computedLines.length === 0 && (
            <div className="p-6 text-center text-sm text-gray-400">No items yet. Add from left.</div>
          )}
          {computedLines.map(({ line, result }) => (
            <div key={line.key} className="p-3 text-sm">
              <div className="flex items-start justify-between">
                <div className="font-medium">
                  {line.description}{" "}
                  <span className="text-xs text-gray-400">({line.metal === "silver" ? `${line.silverPurity ?? 999} Silver` : `${line.karat}K`})</span>
                </div>
                <button onClick={() => removeLine(line.key)} className="text-gray-300 hover:text-red-500">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{formatWeightDual(line.weightGrams)}</div>
              <div className="mt-1 grid grid-cols-2 gap-x-3 text-xs text-gray-500 tnum">
                <span>Gold: {formatPKR(result.goldValue)}</span>
                <span>Making: {formatPKR(result.making)}</span>
                {result.wastage > 0 && <span>Wastage: {formatPKR(result.wastage)}</span>}
                {result.other > 0 && <span>Other: {formatPKR(result.other)}</span>}
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <div className="inline-flex items-center rounded-lg ring-1 ring-gray-200 overflow-hidden">
                  <button
                    onClick={() => changeQty(line.key, -1)}
                    className="px-2 py-0.5 text-gray-600 hover:bg-gray-100"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="px-2.5 text-sm tnum font-medium">{line.quantity}</span>
                  <button
                    onClick={() => changeQty(line.key, +1)}
                    className="px-2 py-0.5 text-gray-600 hover:bg-gray-100"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <div className="font-semibold tnum">{formatPKR(result.lineTotal)}</div>
              </div>
            </div>
          ))}

          {oldGold.map((g) => (
            <div key={g.key} className="p-3 text-sm bg-gold-50/40">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gold-700">Old {g.metal === "silver" ? `Silver ${g.silverPurity ?? 999}` : `Gold ${g.karat}K`}</span>
                <button onClick={() => removeOldGold(g.key)} className="text-gray-300 hover:text-red-500">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatWeightDual(g.weightGrams)}</span>
                <span className="tnum text-red-600">
                  − {formatPKR(computeOldGoldValue(g.weightGrams, g.buyRatePerTola))}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-gray-100 p-4 space-y-1.5 text-sm tnum">
          <Row label="Subtotal" value={formatPKR(totals.subtotal, { decimals: true })} />
          {taxRule && (
            <Row
              label={`Tax (${taxRule.name ?? taxRule.basis})`}
              value={formatPKR(totals.tax, { decimals: true })}
            />
          )}
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Discount</span>
            <input
              id="pos-discount"
              type="number"
              value={discount || ""}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-24 text-right rounded border border-gray-200 px-2 py-1 tnum"
              placeholder="0"
            />
          </div>
          {totals.oldGoldTotal > 0 && (
            <Row label="Less: Old Gold" value={`− ${formatPKR(totals.oldGoldTotal, { decimals: true })}`} />
          )}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200">
            <span className="font-bold">Grand Total</span>
            <span className="text-xl font-extrabold text-navy-900">{formatPKR(totals.grandTotal)}</span>
          </div>

          <div className="pt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Payment Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">EasyPaisa</option>
                <option value="bank">Bank Transfer</option>
                <option value="credit">Credit (Udhaar)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Amount Received</label>
              <input
                type="number"
                value={received === null ? "" : received}
                onChange={(e) => setReceived(e.target.value === "" ? null : Number(e.target.value))}
                placeholder={formatPKR(totals.grandTotal)}
                className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm tnum"
              />
            </div>
          </div>

          {udhaar > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 mt-1">
              <span className="text-sm text-red-600 font-medium">
                Udhaar (balance){customer ? ` → ${customer.name}` : ""}
              </span>
              <span className="tnum font-bold text-red-600">{formatPKR(udhaar)}</span>
            </div>
          )}

          <button
            onClick={save}
            disabled={pending || lines.length === 0}
            className="w-full mt-3 rounded-xl bg-gold text-navy-900 font-bold py-3 text-base hover:brightness-105 disabled:opacity-50"
          >
            {pending ? "Saving…" : `Complete Sale (F2) — ${formatPKR(totals.grandTotal)}`}
          </button>
        </div>
      </div>

      {/* Recall held bills modal */}
      {showRecall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Held Bills</h2>
              <button onClick={() => setShowRecall(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            {held.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">No held bills.</div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {held.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{b.label}</div>
                      <div className="text-xs text-gray-400">{formatDateTime(b.createdAt)}</div>
                    </div>
                    <button
                      onClick={() => recall(b.id)}
                      disabled={pending}
                      className="rounded-lg bg-gold text-navy-900 text-sm font-semibold px-3 py-1.5 hover:brightness-105 disabled:opacity-60"
                    >
                      Recall
                    </button>
                    <button onClick={() => removeHeld(b.id)} className="text-gray-300 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Recalling loads the bill back into the counter and removes it from this list.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
