"use client";

import { useEffect, useState, useTransition } from "react";
import { Usb, Scale, Printer, Inbox, RefreshCw } from "lucide-react";
import { saveSettings } from "@/lib/settingsActions";

export function HardwareSettings({ initial }: { initial: Record<string, string> }) {
  const [ports, setPorts] = useState<{ path: string; manufacturer?: string }[]>([]);
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState("");

  const [f, setF] = useState({
    scale_port: initial.scale_port ?? "",
    scale_baud: initial.scale_baud ?? "9600",
    printer_mode: initial.printer_mode ?? "off",
    printer_port: initial.printer_port ?? "",
    printer_host: initial.printer_host ?? "",
    printer_tcp_port: initial.printer_tcp_port ?? "9100",
    drawer_kick: initial.drawer_kick ?? "0",
  });

  function refreshPorts() {
    setLoadingPorts(true);
    fetch("/api/hardware/ports")
      .then((r) => r.json())
      .then((d) => setPorts(d.ports ?? []))
      .finally(() => setLoadingPorts(false));
  }
  useEffect(refreshPorts, []);

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((p) => ({ ...p, [k]: v }));
    setSaved(false);
  }

  function save() {
    start(async () => {
      await saveSettings(f);
      setSaved(true);
    });
  }

  async function testScale() {
    setTest("Reading scale…");
    try {
      const d = await (await fetch("/api/scale")).json();
      setTest(d.ok ? `✓ Scale: ${d.grams} g (${d.raw})` : `✗ ${d.error}`);
    } catch {
      setTest("✗ Could not reach scale");
    }
  }
  async function testDrawer() {
    setTest("Opening drawer…");
    try {
      const d = await (await fetch("/api/drawer", { method: "POST" })).json();
      setTest(d.ok ? "✓ Drawer kick sent" : `✗ ${d.error}`);
    } catch {
      setTest("✗ Could not reach printer");
    }
  }

  const PortSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
      <option value="">— none —</option>
      <option value="SIMULATE">SIMULATE (no hardware)</option>
      {ports.map((p) => (
        <option key={p.path} value={p.path}>{p.path}{p.manufacturer ? ` — ${p.manufacturer}` : ""}</option>
      ))}
      {value && value !== "SIMULATE" && !ports.some((p) => p.path === value) && <option value={value}>{value}</option>}
    </select>
  );

  return (
    <section className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Usb size={18} className="text-navy-900" />
        <h2 className="font-semibold">Hardware</h2>
        <button onClick={refreshPorts} className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-navy-900">
          <RefreshCw size={13} className={loadingPorts ? "animate-spin" : ""} /> Refresh ports
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Connect a weighing scale and thermal printer. Choose SIMULATE to try the flow without devices.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Scale */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium"><Scale size={15} /> Weighing Scale</div>
          <label className="block text-xs text-gray-500">COM Port</label>
          <PortSelect value={f.scale_port} onChange={(v) => set("scale_port", v)} />
          <label className="block text-xs text-gray-500">Baud Rate</label>
          <select value={f.scale_baud} onChange={(e) => set("scale_baud", e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            {["1200", "2400", "4800", "9600", "19200", "38400", "115200"].map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <button onClick={testScale} className="text-sm rounded-lg bg-gray-100 px-3 py-1.5 hover:bg-gray-200">Test Scale</button>
        </div>

        {/* Printer */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium"><Printer size={15} /> Thermal Printer (ESC/POS)</div>
          <label className="block text-xs text-gray-500">Connection</label>
          <select value={f.printer_mode} onChange={(e) => set("printer_mode", e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="off">Off (use browser print)</option>
            <option value="serial">Serial / USB COM</option>
            <option value="network">Network (IP)</option>
          </select>
          {f.printer_mode === "serial" && (
            <>
              <label className="block text-xs text-gray-500">Printer COM Port</label>
              <PortSelect value={f.printer_port} onChange={(v) => set("printer_port", v)} />
            </>
          )}
          {f.printer_mode === "network" && (
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs text-gray-500">Host / IP</label>
                <input value={f.printer_host} onChange={(e) => set("printer_host", e.target.value)} placeholder="192.168.1.50" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Port</label>
                <input value={f.printer_tcp_port} onChange={(e) => set("printer_tcp_port", e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tnum" />
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm mt-1">
            <input type="checkbox" checked={f.drawer_kick === "1"} onChange={(e) => set("drawer_kick", e.target.checked ? "1" : "0")} />
            <Inbox size={15} /> Kick cash drawer on print
          </label>
          <button onClick={testDrawer} className="text-sm rounded-lg bg-gray-100 px-3 py-1.5 hover:bg-gray-200">Test Drawer</button>
        </div>
      </div>

      {test && <div className="mt-3 text-sm text-gray-700">{test}</div>}

      <div className="flex items-center gap-3 mt-4">
        <button onClick={save} disabled={pending} className="rounded-lg bg-gold text-navy-900 font-semibold px-5 py-2 text-sm hover:brightness-105 disabled:opacity-60">
          {pending ? "Saving…" : "Save Hardware Settings"}
        </button>
        {saved && <span className="text-success text-sm">✓ Saved</span>}
      </div>
    </section>
  );
}
