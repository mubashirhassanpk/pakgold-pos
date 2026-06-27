# Building the PakGold POS desktop app (single `.exe`, zero-install)

This produces a Windows installer that bundles **everything including Node** —
the shopkeeper installs nothing else and just runs "PakGold POS" like any app.

Under the hood, Electron starts the Next.js **standalone** server on a local
port and shows it in a desktop window. Shop data is stored in the user's
`AppData` folder, so app updates never touch it.

## Build it (on a Windows machine with Node 20+)
```bash
npm install          # installs electron + electron-builder + @electron/rebuild
npm run dist
```
`npm run dist` does three things:
1. `next build` → produces the standalone server in `.next/standalone`
2. `npm run electron:prepare` → copies static assets in and **rebuilds
   `better-sqlite3` + `serialport` for Electron's ABI**
3. `electron-builder` → creates the installer

Output: **`dist-electron/PakGold POS Setup <version>.exe`** — ship this single file.

## Try it without packaging (dev smoke test)
```bash
npm run build
npm run electron:prepare
npm run electron:start
```
This launches the Electron window against your built app.

## What the shopkeeper gets
- Double-click the `Setup .exe` → installs to Program Files (or chosen folder),
  creates a **Desktop shortcut "PakGold POS"**.
- Launch it → the app window opens directly (no browser, no terminal, no Node).
- Login: `owner` / `owner123` → change in **Settings → Users**.
- Data: `…\AppData\Roaming\PakGold POS\pakgold.db` (+ `backups\`).
  Back it up from **Settings → Backup & Restore**.

## App icon (optional)
Put a `build/icon.ico` (256×256) before `npm run dist` to brand the app and
installer. Without it, the default Electron icon is used.

## Known gotchas
- **Native modules:** `better-sqlite3` and `serialport` are compiled C++. The
  `electron:prepare` step rebuilds them for Electron — if you skip it, the app
  will crash on database/scale access. `npmRebuild` is disabled in the
  electron-builder config so it doesn't fight this.
- **First build downloads** Electron (~150 MB) and electron-builder toolchain.
  Needs internet once.
- **Hardware** (scale/printer/drawer) works because the app runs locally with
  COM-port access — same as the server build. Configure in Settings → Hardware.
- Build the Windows `.exe` **on Windows** (cross-building from other OSes needs
  extra setup).

## When to use which package
| Goal | Use |
|---|---|
| True one-file install, non-technical shop, no Node | **This Electron `.exe`** |
| Run from source on a PC that already has Node | `Start PakGold.bat` (see `PACKAGING.md`) |
| Host on a server / multi-branch web access | `DEPLOY.md` |
