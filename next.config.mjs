/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server output in .next/standalone — needed by the Electron
  // desktop build. Enabled only when STANDALONE=1 (set by `npm run dist`), so
  // plain web hosting (Hostinger etc.) uses a normal build + `next start`.
  ...(process.env.STANDALONE === "1" ? { output: "standalone" } : {}),
  // better-sqlite3 / serialport are native Node modules; keep them external so
  // Next does not bundle the .node binaries (they are copied into standalone).
  serverExternalPackages: ["better-sqlite3", "serialport"],
};

export default nextConfig;
