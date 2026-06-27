# What's New — PakGold POS update

This update adds five things you asked for, plus a layout fix.

## 1. Fixed sidebar + show/hide toggle (scrolling fix)
The sidebar no longer scrolls away with the page. The layout is now:

- A **fixed** sidebar on the left that stays put.
- A sticky top bar with a **collapse / expand** button (desktop) — collapses the
  sidebar to an icon rail. Your choice is remembered between visits.
- On phones/tablets the sidebar becomes a **slide-in drawer** opened from the ☰ menu.
- Only the main content area scrolls — the sidebar and top bar are always visible.

Files: `src/components/AppShell.tsx` (new), `src/components/Sidebar.tsx`,
`src/app/(app)/layout.tsx`.

## 2. Committees / BC (gold-saving scheme management)
New **Committees / BC** section in the sidebar.

- Create a committee as **gold** (save X grams/member/month) or **cash**.
- Add members (pick from saved customers), set each member's payout month.
- Record monthly **instalments** — for gold committees the rupee amount is
  auto-converted to grams at the rate you enter, so saved gold tracks correctly.
- Record **payouts** (cash, gold, bank, or handed-over item).
- Per-member rollups: months paid, total saved, payout taken.

Files: `src/lib/committees.ts`, `src/lib/committeeActions.ts`,
`src/app/(app)/committees/*`.

## 3. Stone & diamond detail
On the inventory item form, add an itemised stone list: type, shape, count,
**carat**, colour, clarity, lab + certificate number, rate/carat, and value.
The stones total auto-fills the item's Stones charge. Shown on the item detail
page. Files: `src/lib/db/schema.ts` (`item_stones`), `inventoryActions.ts`,
`inventory/ItemForm.tsx`, `inventory/[id]/page.tsx`.

## 4. Hallmark & purity certificate printing
Items now carry an **assay lab** (PCSIR/SGS/…​), **certificate number** and date.
When a piece with hallmark details is sold, a "Hallmark / Purity Certificate"
block prints on the A4 invoice. Files: schema (`hallmark_lab`, `cert_no`,
`cert_date`), `sales.ts`, `components/A4Invoice.tsx`.

## 5. Label / printer profiles
The barcode-label screen (Inventory → Print Labels) has a **profile picker** with
presets for common Pakistani jewellery tags (dumbbell, butterfly) and thermal
label rolls (38×25, 50×25, 48×30 mm). The dumbbell/butterfly tags render with the
barcode bridge + two flaps. Your last-used profile is remembered. Files:
`src/lib/constants.ts` (`LABEL_PROFILES`), `inventory/labels/LabelSheet.tsx`.

## 6. Install as a PWA
The app is now installable from the browser (Chrome/Edge: "Install app").

- `public/manifest.webmanifest`, app icons in `public/icons/`.
- `public/sw.js` service worker: caches static assets, network-first for pages,
  with an `offline.html` fallback.
- Registered via `src/components/PWARegister.tsx` from the root layout.

> Note: this is an offline-**installable** app, not a fully offline one — pages are
> served by your local shop server, so keep the PakGold server running.

---

## Applying the database update
This update adds new tables/columns, so run the migration once:

```bash
npm run db:migrate
```

If you use the double-click launcher (`Start PakGold.bat`), migrations run
automatically on start — no action needed. Your existing data is preserved.

---

# Update 2 — staff performance, international rates, auto-fetch

## 7. Per-salesman performance
Reports now has a **Staff Performance** table: bills, gold value, making, wastage,
discount, average bill and total sales for each salesman, for the selected date
range (Today / 7 days / This month / All time). Sales are attributed to the user
who created the bill. Files: `src/lib/reports.ts`, `reports/page.tsx`.

## 8. Multi-currency / international rate display
A new **International Rate** panel shows **USD/oz** and **PKR/tola side by side**,
with a per-karat comparison of the international (spot + premium) rate against your
shop's sell rate, and the difference. Appears on the Dashboard and the Gold Rates
page when enabled. Files: `src/lib/intl.ts`, `src/components/IntlRatePanel.tsx`.

## 9. Daily rate auto-fetch (optional, offline-tolerant)
The app can pull the international spot gold price + USD→PKR each morning and show
a suggested PKR/tola (with your local **premium %**).

- Turn it on in **Settings → International Rate & Auto-fetch**.
- Options: show the panel, auto-fetch on the first load of the day, and optionally
  **auto-apply** the fetched rate as today's billing rate (owner/manager only).
- **Offline-tolerant:** fetches use a hard timeout; if the shop is offline the last
  known values are shown and billing keeps using your saved manual rate. Nothing
  breaks without internet.
- **Manual override always wins:** unless auto-apply is on, the fetched rate is only
  a suggestion — your saved rate is what bills.
- **Sources are configurable** (free no-key defaults provided): a spot endpoint
  returning `{ "price": <usd/oz> }` and an FX endpoint returning
  `{ "rates": { "PKR": <rate> } }`. Use **Test fetch** in settings to verify.

> Note on sources: the default endpoints (gold-api.com, open.er-api.com) are free and
> need no key, but third-party uptime/coverage can change. If a default ever stops
> working, paste any equivalent endpoint URL in Settings — the parser accepts common
> shapes. Verify with the **Test fetch** button.
