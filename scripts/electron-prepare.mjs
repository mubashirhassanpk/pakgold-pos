/**
 * Prepare the Next.js standalone output for Electron packaging:
 *  1. copy static assets next to the standalone server,
 *  2. rebuild native modules (better-sqlite3, serialport) for Electron's ABI.
 *
 * Run after `next build`. Used by `npm run dist`.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(standalone)) {
  console.error("✗ .next/standalone not found. Run `next build` first (output: 'standalone').");
  process.exit(1);
}

// 1. Static assets the standalone server expects to find itself.
const copies = [
  [path.join(root, ".next", "static"), path.join(standalone, ".next", "static")],
  [path.join(root, "public"), path.join(standalone, "public")],
];
for (const [from, to] of copies) {
  if (fs.existsSync(from)) {
    fs.cpSync(from, to, { recursive: true });
    console.log("copied", path.relative(root, from), "→", path.relative(root, to));
  }
}

// 2. Rebuild native modules in the standalone bundle for Electron.
console.log("Rebuilding native modules for Electron (better-sqlite3, serialport)…");
const res = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["electron-rebuild", "-m", standalone, "--only", "better-sqlite3,serialport"],
  { stdio: "inherit", shell: true }
);
if (res.status !== 0) {
  console.error(
    "\n✗ electron-rebuild failed. The .exe may crash on DB/scale access.\n" +
      "  Ensure devDependencies are installed, then re-run `npm run dist`."
  );
  process.exit(res.status || 1);
}
console.log("✅ Standalone prepared for Electron packaging.");
