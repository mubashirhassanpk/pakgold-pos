<h1 align="center">PakGold POS — سونے کا پی او ایس</h1>

<p align="center">
  <b>Offline-first Gold &amp; Jewellery Point-of-Sale for Pakistani Sarafa / Zargari businesses.</b><br/>
  Accuracy, speed &amp; trust — Tola/Gram support, configurable FBR-style tax, old-gold exchange,
  and a bilingual (English + Urdu) thermal receipt.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white">
  <img alt="SQLite" src="https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white">
  <img alt="Drizzle ORM" src="https://img.shields.io/badge/ORM-Drizzle-C5F74F?logo=drizzle&logoColor=black">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white">
</p>

<p align="center">
  <img alt="Offline first" src="https://img.shields.io/badge/Offline--first-✓-1F9D55">
  <img alt="Bilingual" src="https://img.shields.io/badge/Bilingual-EN%20%2B%20اردو-D4AF37">
  <img alt="Platform" src="https://img.shields.io/badge/Platform-Windows%20%7C%20Web-0B1120">
  <img alt="Status" src="https://img.shields.io/badge/Status-Feature%20complete-1F9D55">
  <img alt="License" src="https://img.shields.io/badge/License-Proprietary-lightgrey">
</p>

> **Suggested repo name:** `pakgold-pos` (matches `package.json`). Alternatives: `zargarpos`, `sarafapos`.
>
> **Status: Feature-complete.** Gold rates · fast POS (inventory + custom + old-gold + udhaar + hold/recall) ·
> bilingual thermal receipt · A4 invoice + WhatsApp · inventory + barcodes + supplier purchase ·
> customer CRM · repair/job-work · reports · auth + roles · configurable tax · backup/restore ·
> hardware (scale / ESC-POS printer / cash drawer).

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js 15** (App Router, RSC + Server Actions) | One process runs locally on the shop PC |
| Language | TypeScript (strict) | Safety for money math |
| DB | **SQLite** via `better-sqlite3` + **Drizzle ORM** | Fast, synchronous, file-based, 100% offline |
| UI | Tailwind CSS, gold/navy theme, `lucide-react` | Premium, touch-friendly |
| Urdu | `Noto Nastaliq Urdu` (next/font, self-hosted) + RTL | Correct Nastaliq rendering |
| Tests | Vitest | Calculation engine is fully unit-tested |

### Why "Next.js running locally" (not a browser PWA)
A browser PWA cannot reliably reach RS-232 weighing scales or ESC/POS printers on
Windows. PakGold therefore runs as a **local Next.js server on the shop machine** —
fully offline, no internet needed — and the browser is just the screen. This keeps a
clean path to add scale/printer/cash-drawer hardware via the Node server in **Phase 3**.

---

## Quick start

```bash
# 1. Install dependencies (builds the better-sqlite3 native module)
npm install

# 2. Create the database schema
npm run db:generate     # generate SQL migration from the Drizzle schema
npm run db:migrate      # apply it to ./pakgold.db

# 3. Load sample data (rates, categories, 5 items, tax rules)
npm run db:seed

# 4. Run
npm run dev             # http://localhost:3000
```

**Default login (seed):** `owner` / `owner123`

Authentication is implemented: a `/login` screen, **scrypt** password hashing (Node built-in — no native bcrypt dependency), cookie sessions (`sessions` table), edge **middleware** that gates every route, and **role-based access** (owner / manager / accountant / salesman). The logged-in user is recorded on every sale, rate change, and audit-log entry. Old SHA-256 seed hashes are transparently re-hashed to scrypt on first successful login.

### Manage logins / forgot password
- **Change username, reset a staff password, change role, enable/disable** — owner does this in
  **Settings → Users & Roles**. Owners/staff can change their **own** password in **Settings →
  Change My Password**.
- **Locked out (forgot username *and* password)?** There is no email reset (the app is offline).
  On the machine/host that has the database, run:
  ```bash
  npm run reset-password                         # lists usernames (to find yours)
  npm run reset-password -- owner NewPass123     # set a new password (re-enables the account)
  ```
  On hosting, set `DATABASE_PATH` first if your DB lives outside the project folder.

### Run the calculation tests
```bash
npm test
```

### Reset everything
```bash
npm run db:reset && npm run db:migrate && npm run db:seed
```

---

## Deploy to Hostinger (GitHub → live web)

PakGold runs as a **long-lived Node.js server** (Next.js + SQLite), so use Hostinger's
**Node.js app / Git deploy**. It will **not** run on plain shared/PHP hosting or on
serverless (Vercel/Netlify). For a generic VPS see [`DEPLOY.md`](./DEPLOY.md).

1. **Push this project to GitHub** (repo: `pakgold-pos`).
2. In **hPanel → Websites → your site → Node.js / Git deploy**, **import from GitHub**
   and pick the `pakgold-pos` repo.
3. **Review build settings:**
   - **Framework preset:** Next.js
   - **Branch:** main
   - **Node version:** 22.x
   - **Root directory:** `./`
   - **Build and output:** Default for Next.js
4. **Environment variables → Add** — set this (recommended for data safety; it keeps the
   database *outside* the deploy folder so re-deploys never wipe shop data):

   | Name | Value |
   |---|---|
   | `DATABASE_PATH` | `/home/u152516335/pakgold-data/pakgold.db` |

   > Replace `u152516335` with your own Hostinger home folder if it differs. The folder is
   > created automatically on first run. **Do not** set `PORT` — Hostinger sets it.
5. Click **Deploy**. Hostinger runs `npm install` + `npm run build`, then starts the server.
   On first boot the app **auto-creates the database, applies all migrations, and seeds the
   owner login** — no manual `db:migrate` / `db:seed` step is needed.
6. Open the site → **login `owner` / `owner123`** → change it immediately in
   **Settings → Users**, then set shop name, NTN/STRN, tax and rates.

**Notes**
- 🖨️ Hardware (thermal printer, weighing scale, cash drawer) only works when the server
  runs on the shop PC (local COM ports). On remote hosting set **Settings → Hardware →
  Printer = Off** and use the browser / A4 printing.
- 💾 Take regular backups from **Settings → Backup & Restore**, especially before a redeploy.
- 🔁 To update: push to `main` and redeploy — data at `DATABASE_PATH` is preserved and new
  migrations apply automatically on the next start.

> Build modes: a normal `npm run build` produces a standard server build for web hosting
> (`next start`). The Electron desktop package uses `npm run dist`, which builds with
> `STANDALONE=1` for the bundled standalone server.

---

## Project structure

```
src/
├─ app/
│  ├─ layout.tsx            # Shell + EN/UR fonts + sidebar
│  ├─ page.tsx              # Dashboard (rate banner, stats, quick actions)
│  ├─ pos/
│  │  ├─ page.tsx           # Server: loads rates/inventory/tax
│  │  ├─ PosClient.tsx      # The billing screen (custom + item + old gold)
│  │  └─ Receipt.tsx        # 80mm bilingual thermal receipt
│  ├─ rates/                # Daily SELL/BUYBACK rate editor (+ history)
│  ├─ inventory/            # Stock list valued at today's rate
│  └─ customers|reports|settings/   # Phase 2/3 stubs
├─ components/              # Sidebar, RateBanner, StatCards, ComingSoon
└─ lib/
   ├─ constants.ts          # Tola/Masha, karat purity factors, enums
   ├─ units.ts              # Weight conversions (all internal math = grams)
   ├─ calculations.ts       # ⭐ PURE pricing engine (gold/making/wastage/tax)
   ├─ calculations.test.ts  # Engine unit tests
   ├─ format.ts             # PKR + dual gram/tola display
   ├─ queries.ts            # Server-only reads
   ├─ actions.ts            # Server Actions: updateRates, createSale (atomic)
   └─ db/                   # schema, client, migrate, seed, reset
```

---

## The calculation engine (`src/lib/calculations.ts`)

Every rupee comes from one pure-function file. The model matches Pakistani practice:

```
Gold Value  = (net weight in tola) × rate-per-tola for that purity
Making      = per-gram × weight  |  fixed  |  % of gold value      (مزدوری)
Wastage     = extra weight valued at rate | % of gold value | fixed (کاٹ)
Other       = polish + hallmark + stones + certificate
-----------------------------------------------------------------
Line Total  = Gold + Making + Wastage + Other
Subtotal    = Σ line totals
Tax         = configurable BASIS × configurable RATE   ← never hardcoded
Old Gold    = customer's old gold @ BUYBACK rate (deducted)
Grand Total = Subtotal + Tax − Discount − Old Gold
```

**Units:** `1 tola = 11.664 g`, `1 masha = 0.972 g`. Internals are grams; Tola & Gram
are shown side-by-side everywhere.

**Purity factors:** 24K = 0.999, 22K = 0.916 (the dominant "916" jewellery gold),
21K = 0.875, 18K = 0.750. The rate editor can auto-fill all karats from one 24K rate.

---

## Customising tax (FBR rules change often)

Tax is **fully configurable** — only the *basis* is fixed in code; the rate/amount
lives in the `tax_rules` table. Supported bases:

| Basis | Meaning |
|---|---|
| `making_only` | Tax % on making charges only (common reduced scheme) |
| `gold_plus_making` | Tax % on gold value + making (full value addition) |
| `total` | Tax % on the whole subtotal |
| `fixed` | Flat rupee amount per invoice (small-shop fixed tax) |

The active rule (`active = true`) is applied at billing. Edit rules via SQL today;
a Settings UI ships in **Phase 3**. **Verify the correct scheme with your accountant /
FBR status before going live** — the seeded 3%-on-making rule is only an example.
Put your **NTN / STRN** in `settings` to print them on every invoice.

---

## Hardware

Configured in **Settings → Hardware** (owner). Choose `SIMULATE` on any device to try the flow without hardware.

- **Weighing scale** (RS-232 / USB COM) → `serialport`. Pick the COM port + baud rate; the POS **"Get from Scale"** buttons (custom sale & old gold) read a stable weight in grams. Tolerant ASCII parser handles common jewellery-scale formats. `GET /api/scale`.
- **Thermal printer 80mm** (ESC/POS) → serial COM **or** network (IP:9100). The app generates raw ESC/POS bytes (bold/center/double-size, auto-cut) and sends them directly. `POST /api/print/<saleId>`. The browser-print receipt and A4 invoice remain as fallbacks. *(ESC/POS receipt is English; Urdu stays on the browser receipt & A4 invoice.)*
- **Cash drawer** → kicked via the printer (ESC `p`) on print, or tested from Settings. `POST /api/drawer`.
- **Barcode scanner** → works now (HID keyboard); the POS search box and label barcodes (Code 128) support scanning.

> ⚠️ Hardware must be validated on the real devices plugged into the shop PC. Everything is verified end-to-end in `SIMULATE` mode here.

---

## Roadmap

- **Phase 1 (this):** Rates · POS · old-gold on bill · receipt · inventory · dashboard.
- **Phase 2:** Repair/job-work, Customer CRM, full reports & charts, supplier purchase entry, dedicated old-gold screen.
- **Phase 3:** Multi-user/roles, scale + printer + drawer, A4/PDF invoice, WhatsApp share, backup/restore, Settings & Tax UI.
- **Phase 4:** UX polish, Urdu perfection, FBR digital-invoicing (Tier-1), cloud sync.

---

*Built for the Sarafa Bazaar. Accuracy first. شکریہ*
