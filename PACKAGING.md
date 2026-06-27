# Deploying PakGold POS to a shop PC

PakGold POS runs as a small local web server on the shop's Windows PC; the
browser is just the screen. No internet is needed after setup.

## What the shopkeeper needs (one time)
1. **Node.js 20+** — install from <https://nodejs.org> (LTS, "Windows Installer").
   This is the only prerequisite.
2. Copy the **PakGold POS** folder anywhere (e.g. `C:\PakGold`).

## Install (one time)
Double-click **`Install PakGold.bat`**. It installs dependencies and builds the
app. This needs internet **once** (to download packages); everything afterward
is fully offline.

## Daily use
Double-click **`Start PakGold.bat`**. It will:
- apply any database updates,
- load sample data on the very first run,
- start the server and open the browser at <http://localhost:3000>.

Keep the black window open while using the app; closing it stops the server.

**Default login:** `owner` / `owner123` — change it in Settings → Users.

## Where is my data?
All shop data lives in **`data\pakgold.db`** inside the app folder. Use
**Settings → Backup & Restore** to back it up to a USB/cloud drive regularly.
Updating the app (replacing files) does **not** touch the `data` folder.

## Auto-start on boot (optional)
Press `Win+R`, type `shell:startup`, Enter, and drop a **shortcut** to
`Start PakGold.bat` into that folder. PakGold will then launch when Windows starts.

## Run on a different port
Set an environment variable before launching, e.g. `set PORT=4000` then run the
batch file, or edit the shortcut to `cmd /c "set PORT=4000 && npm run launch"`.

## Hardware
Configure the weighing scale, thermal printer, and cash drawer in
**Settings → Hardware**. See the Hardware section of `README.md`. Use `SIMULATE`
to try the workflow before the devices are connected.

## Updating to a new version
1. Back up first (Settings → Backup & Restore).
2. Replace the app files **except** the `data` folder.
3. Run `Install PakGold.bat` again (rebuilds), then `Start PakGold.bat`
   (migrations apply automatically).

---

### Note on full bundling
For a true single-`.exe` (bundling Node so the shopkeeper installs nothing), the
app can later be wrapped with Electron or a Node packager. The batch-file
approach above is the simplest reliable option and keeps native modules
(`better-sqlite3`, `serialport`) working without extra tooling.
