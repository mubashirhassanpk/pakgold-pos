"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/lib/settingsActions";
import { DEFAULT_SPOT_URL, DEFAULT_FX_URL } from "@/lib/intl";

export function IntlRateSettings({ initial }: { initial: Record<string, string> }) {
  const [enabled, setEnabled] = useState(initial.intl_enabled === "1");
  const [autofetch, setAutofetch] = useState(initial.intl_autofetch === "1");
  const [autoapply, setAutoapply] = useState(initial.intl_autoapply === "1");
  const [premium, setPremium] = useState(initial.intl_premium_pct ?? "");
  const [spotUrl, setSpotUrl] = useState(initial.intl_spot_url ?? "");
  const [fxUrl, setFxUrl] = useState(initial.intl_fx_url ?? "");
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  function save() {
    start(async () => {
      await saveSettings({
        intl_enabled: enabled ? "1" : "",
        intl_autofetch: autofetch ? "1" : "",
        intl_autoapply: autoapply ? "1" : "",
        intl_premium_pct: premium || "0",
        intl_spot_url: spotUrl.trim(),
        intl_fx_url: fxUrl.trim(),
      });
      setSaved(true);
    });
  }

  async function testFetch() {
    setTesting(true);
    setTestMsg(null);
    try {
      const res = await fetch("/api/rates/intl", { cache: "no-store" });
      const data = await res.json();
      if (data.usdPerOz && data.usdPkr) {
        setTestMsg(
          `OK — spot $${data.usdPerOz}/oz, USD→PKR ${data.usdPkr}, 24K ≈ Rs ${data.pkrPerTola24k?.toLocaleString("en-PK")}/tola${
            data.live ? "" : " (last known — live fetch failed)"
          }`
        );
      } else {
        setTestMsg(`Failed: ${data.error ?? "no rate"}`);
      }
    } catch {
      setTestMsg("Failed: offline or source unreachable");
    } finally {
      setTesting(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white ring-1 ring-black/5 p-5">
      <h2 className="font-semibold mb-1">International Rate &amp; Auto-fetch</h2>
      <p className="text-xs text-gray-500 mb-4">
        Show USD/oz alongside PKR/tola, and optionally pull the spot rate each morning. Fully optional and
        offline-tolerant — billing always uses your saved rate unless you turn on auto-apply.
      </p>

      <div className="space-y-2.5">
        <Toggle label="Show international rate panel" checked={enabled} onChange={setEnabled} />
        <Toggle
          label="Auto-fetch each morning (first load of the day)"
          checked={autofetch}
          onChange={setAutofetch}
          disabled={!enabled}
        />
        <Toggle
          label="Auto-apply fetched rate as today's billing rate"
          hint="Inserts a new rate row from spot + premium. Leave off to only show a suggestion."
          checked={autoapply}
          onChange={setAutoapply}
          disabled={!enabled}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Local premium over spot (%)</label>
          <input
            type="number"
            value={premium}
            onChange={(e) => { setPremium(e.target.value); setSaved(false); }}
            placeholder="e.g. 5"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm tnum outline-none focus:border-gold"
          />
        </div>
        <div className="hidden sm:block" />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Spot gold source (USD/oz)</label>
          <input
            value={spotUrl}
            onChange={(e) => { setSpotUrl(e.target.value); setSaved(false); }}
            placeholder={DEFAULT_SPOT_URL}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">USD → PKR source</label>
          <input
            value={fxUrl}
            onChange={(e) => { setFxUrl(e.target.value); setSaved(false); }}
            placeholder={DEFAULT_FX_URL}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-gold"
          />
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-2">
        Leave the source fields blank to use the free no-key defaults. Any endpoint returning the spot price
        (e.g. <code>{`{ "price": 2345 }`}</code>) or USD→PKR (<code>{`{ "rates": { "PKR": 278 } }`}</code>) works.
      </p>

      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <button
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-gold text-navy-900 font-semibold px-5 py-2 text-sm hover:brightness-105 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          onClick={testFetch}
          disabled={testing}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm hover:bg-gray-200 disabled:opacity-60"
        >
          {testing ? "Testing…" : "Test fetch"}
        </button>
        {saved && <span className="text-success text-sm">✓ Saved</span>}
        {testMsg && <span className="text-xs text-gray-500">{testMsg}</span>}
      </div>
    </section>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-2.5 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-gold"
      />
      <span className="text-sm">
        {label}
        {hint && <span className="block text-xs text-gray-400">{hint}</span>}
      </span>
    </label>
  );
}
