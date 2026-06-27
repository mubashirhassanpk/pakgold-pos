/**
 * Build with Next.js standalone output enabled (for the Electron desktop
 * package). Sets STANDALONE=1 so next.config.mjs emits .next/standalone.
 * Plain `npm run build` stays a normal server build for web hosting.
 */
import { spawnSync } from "node:child_process";

const r = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, STANDALONE: "1" },
});
process.exit(r.status ?? 0);
