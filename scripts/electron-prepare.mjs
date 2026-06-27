/**
 * Prepare the Next.js standalone output for Electron packaging:
 *  1. copy static assets next to the standalone server,
 *  2. backfill packages that Next's tracer ships incomplete (or not at all),
 *  3. rebuild native modules (better-sqlite3) for Electron's ABI.
 *
 * Run after `next build`. Used by `npm run dist`.
 *
 * Why step 2 exists:
 *  - better-sqlite3 is a serverExternalPackage, so Next copies it into the
 *    standalone — but only build/, lib/ and package.json. The C++ sources
 *    (binding.gyp, src/, deps/) are left behind, so electron-rebuild has
 *    nothing to compile and the Node-ABI prebuilt .node survives, crashing
 *    Electron with a NODE_MODULE_VERSION mismatch. We copy the full package
 *    from the root node_modules so the rebuild can run from source.
 *  - drizzle-orm gets webpack-bundled into the server chunks, so the package
 *    is never copied into the standalone at all. electron/firstrun.cjs does a
 *    runtime require("drizzle-orm/better-sqlite3") from the bundle for the
 *    first-run migration, which then fails. We copy the package in so that
 *    require resolves. (drizzle-orm is dependency-free, so a plain copy is
 *    enough.)
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const require = createRequire(import.meta.url);

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

// 2. Backfill packages the tracer shipped incomplete / not at all, copying the
//    complete package from the root node_modules into the standalone bundle.
function backfillPackage(pkg) {
  const from = path.join(root, "node_modules", pkg);
  if (!fs.existsSync(from)) {
    console.error(`✗ ${pkg} not found in node_modules — run npm install first.`);
    process.exit(1);
  }
  const to = path.join(standalone, "node_modules", pkg);
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`backfilled node_modules/${pkg} into standalone (full package)`);
}
backfillPackage("better-sqlite3"); // brings binding.gyp/src/deps so rebuild works
backfillPackage("drizzle-orm"); // bundled into chunks, otherwise absent at runtime

// 3. Rebuild native modules in the standalone bundle for Electron's ABI.
//    better-sqlite3 is NAN/V8-based (ABI-versioned), so it MUST match Electron.
//    serialport's native binding is N-API (ABI-stable) and needs no rebuild.
const electronVersion = require("electron/package.json").version;
console.log(`Rebuilding better-sqlite3 for Electron ${electronVersion}…`);
const res = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["electron-rebuild", "-f", "-v", electronVersion, "-m", standalone, "--only", "better-sqlite3"],
  { stdio: "inherit", shell: true }
);
if (res.status !== 0) {
  console.error(
    "\n✗ electron-rebuild failed. The .exe may crash on DB access.\n" +
      "  Ensure devDependencies are installed, then re-run `npm run dist`."
  );
  process.exit(res.status || 1);
}

// 4. Sanity-check the binary exists where Electron will load it. electron-rebuild
//    (-f, pinned to -v <electronVersion>) obtains the Electron-ABI binary — via a
//    prebuilt download when available, else compiled from the sources backfilled
//    in step 2. This guard just catches a vanished/failed output.
const builtBinary = path.join(standalone, "node_modules", "better-sqlite3", "build", "Release", "better_sqlite3.node");
if (!fs.existsSync(builtBinary)) {
  console.error(`✗ Expected rebuilt binary not found: ${path.relative(root, builtBinary)}`);
  process.exit(1);
}

console.log("✅ Standalone prepared for Electron packaging.");
