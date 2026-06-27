/**
 * PakGold POS — Electron desktop wrapper.
 *
 * Runs the Next.js standalone server inside Electron (using Electron's bundled
 * Node, so the shopkeeper installs nothing) and shows it in a window. Shop data
 * lives in the OS userData folder so app updates never touch it.
 */
const { app, BrowserWindow, shell, dialog } = require("electron");
const path = require("node:path");
const http = require("node:http");
const { fork } = require("node:child_process");

const PORT = process.env.PAKGOLD_PORT || 34115;
const HOST = "127.0.0.1";
const isPackaged = app.isPackaged;

// Resolve bundled resources (standalone server, migrations).
const resDir = isPackaged ? process.resourcesPath : path.join(__dirname, "..");
const standaloneDir = isPackaged
  ? path.join(resDir, "standalone")
  : path.join(resDir, ".next", "standalone");
const drizzleDir = isPackaged ? path.join(resDir, "drizzle") : path.join(resDir, "drizzle");

// Persistent, update-safe data location.
const dataDir = app.getPath("userData");
const DB_PATH = path.join(dataDir, "pakgold.db");
const BACKUP_DIR = path.join(dataDir, "backups");

let serverProc = null;
let win = null;

function firstRunSetup() {
  // Migrate + seed using the standalone's (Electron-ABI) better-sqlite3.
  const { initDatabase } = require("./firstrun.cjs");
  initDatabase({ standaloneDir, drizzleDir, dbPath: DB_PATH });
}

function startServer() {
  const serverJs = path.join(standaloneDir, "server.js");
  serverProc = fork(serverJs, [], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(PORT),
      HOSTNAME: HOST,
      DATABASE_PATH: DB_PATH,
      BACKUP_DIR,
    },
    cwd: standaloneDir,
    stdio: "inherit",
  });
  serverProc.on("exit", (code) => {
    if (code && code !== 0 && !app.isQuitting) {
      dialog.showErrorBox("PakGold POS", `The server stopped unexpectedly (code ${code}).`);
    }
  });
}

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const ping = () => {
      const req = http.get(url, (res) => {
        res.destroy();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error("Server did not start in time"));
        else setTimeout(ping, 400);
      });
    };
    ping();
  });
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    backgroundColor: "#0B1120",
    title: "PakGold POS",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true },
  });

  // Open external links in the system browser (WhatsApp, etc.).
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http") && !url.includes(`${HOST}:${PORT}`)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  const url = `http://${HOST}:${PORT}/login`;
  try {
    await waitForServer(`http://${HOST}:${PORT}/login`);
    await win.loadURL(url);
  } catch (e) {
    dialog.showErrorBox("PakGold POS", `Could not start the app:\n${e.message}`);
    app.quit();
  }
}

app.whenReady().then(() => {
  try {
    firstRunSetup();
  } catch (e) {
    dialog.showErrorBox("PakGold POS — database setup failed", String(e && e.message ? e.message : e));
    app.quit();
    return;
  }
  startServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (serverProc) try { serverProc.kill(); } catch {}
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
