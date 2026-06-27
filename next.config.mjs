/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained server output in .next/standalone — used by the Electron
  // desktop build (and a smaller footprint for server hosting too).
  output: "standalone",
  // better-sqlite3 / serialport are native Node modules; keep them external so
  // Next does not bundle the .node binaries (they are copied into standalone).
  serverExternalPackages: ["better-sqlite3", "serialport"],
};

export default nextConfig;
