/**
 * Hardware integration — weighing scale (RS-232/USB COM), ESC/POS thermal
 * printer, and cash-drawer kick. All runs server-side on the shop PC.
 *
 * NOTE: requires the app to run as a local Node server (which it does). Final
 * validation must happen on real devices. Set a port to "SIMULATE" to demo
 * without hardware.
 */
import "server-only";
import net from "node:net";

export interface HardwareConfig {
  scalePort: string; // e.g. COM3 (Windows) or /dev/ttyUSB0, or "SIMULATE"
  scaleBaud: number;
  printerMode: "off" | "serial" | "network";
  printerPort: string; // COM port for serial printer, or "SIMULATE"
  printerHost: string; // host for network printer
  printerTcpPort: number; // usually 9100
  drawerKick: boolean;
}

export function readHardwareConfig(settings: Record<string, string>): HardwareConfig {
  return {
    scalePort: settings.scale_port || "",
    scaleBaud: Number(settings.scale_baud) || 9600,
    printerMode: (settings.printer_mode as HardwareConfig["printerMode"]) || "off",
    printerPort: settings.printer_port || "",
    printerHost: settings.printer_host || "",
    printerTcpPort: Number(settings.printer_tcp_port) || 9100,
    drawerKick: settings.drawer_kick === "1",
  };
}

/** List available serial ports for the settings UI. */
export async function listSerialPorts(): Promise<{ path: string; manufacturer?: string }[]> {
  try {
    const { SerialPort } = await import("serialport");
    const ports = await SerialPort.list();
    return ports.map((p) => ({ path: p.path, manufacturer: p.manufacturer }));
  } catch {
    return [];
  }
}

const numFrom = (s: string): number | null => {
  const m = s.match(/-?\d+(\.\d+)?/g);
  if (!m || m.length === 0) return null;
  // last number on the line is usually the weight
  const n = Number(m[m.length - 1]);
  return Number.isFinite(n) ? n : null;
};

/**
 * Read a stable weight (grams) from the scale. Most jewellery scales stream
 * ASCII lines continuously; we collect for a short window and take a value
 * that repeats (stable), else the last parsed value.
 */
export async function readScale(cfg: HardwareConfig): Promise<{ grams: number; raw: string }> {
  if (!cfg.scalePort || cfg.scalePort === "SIMULATE") {
    return { grams: 11.664, raw: "SIMULATE 11.664 g" };
  }
  const { SerialPort } = await import("serialport");
  return new Promise((resolve, reject) => {
    const port = new SerialPort({ path: cfg.scalePort, baudRate: cfg.scaleBaud }, (err) => {
      if (err) reject(new Error(`Scale open failed: ${err.message}`));
    });
    let buf = "";
    let last: number | null = null;
    let stable: number | null = null;

    const finish = (val: number | null, raw: string) => {
      clearTimeout(timer);
      try { port.close(); } catch {}
      if (val === null) reject(new Error("No reading from scale"));
      else resolve({ grams: val, raw });
    };

    const timer = setTimeout(() => finish(last, buf.slice(-80)), 2500);

    port.on("data", (d: Buffer) => {
      buf += d.toString("ascii");
      const lines = buf.split(/[\r\n]+/);
      for (const line of lines) {
        const n = numFrom(line);
        if (n === null) continue;
        if (last !== null && Math.abs(n - last) < 0.0005) {
          stable = n; // two consecutive equal readings = stable
        }
        last = n;
      }
      if (stable !== null) finish(stable, buf.slice(-80));
    });
    port.on("error", (e) => finish(null, e.message));
  });
}

// --- ESC/POS receipt -----------------------------------------------------------
const ESC = 0x1b, GS = 0x1d;

class EscPos {
  private bytes: number[] = [];
  raw(...b: number[]) { this.bytes.push(...b); return this; }
  text(s: string) { for (const c of s) this.bytes.push(c.charCodeAt(0) & 0xff); return this; }
  line(s = "") { this.text(s).raw(0x0a); return this; }
  init() { return this.raw(ESC, 0x40); }
  align(a: "left" | "center" | "right") { return this.raw(ESC, 0x61, a === "center" ? 1 : a === "right" ? 2 : 0); }
  bold(on: boolean) { return this.raw(ESC, 0x45, on ? 1 : 0); }
  size(big: boolean) { return this.raw(GS, 0x21, big ? 0x11 : 0x00); }
  feed(n = 3) { return this.raw(ESC, 0x64, n); }
  cut() { return this.raw(GS, 0x56, 66, 0); }
  drawer() { return this.raw(ESC, 0x70, 0, 25, 250); }
  buffer() { return Buffer.from(this.bytes); }
}

interface ReceiptData {
  invoiceNo: string;
  createdAt: number;
  items: { description: string; quantity: number; lineTotal: number }[];
  subtotal: number;
  taxTotal: number;
  discount: number;
  oldGoldTotal: number;
  grandTotal: number;
  paidTotal: number;
  method?: string;
}

const money = (n: number) => "Rs " + Math.round(n).toLocaleString("en-PK");

/** Build an 80mm ESC/POS receipt (English; Urdu stays on the browser/A4 copy). */
export function buildReceipt(settings: Record<string, string>, d: ReceiptData): Buffer {
  const p = new EscPos();
  p.init().align("center").bold(true).size(true).line(settings.shop_name_en || "PakGold").size(false);
  p.bold(false);
  if (settings.address) p.line(settings.address);
  if (settings.phone) p.line("Ph: " + settings.phone);
  if (settings.ntn) p.line(`NTN: ${settings.ntn}${settings.strn ? "  STRN: " + settings.strn : ""}`);
  p.line("--------------------------------");
  p.align("left").line(`Invoice: ${d.invoiceNo}`).line(new Date(d.createdAt).toLocaleString("en-PK"));
  p.line("--------------------------------");
  for (const it of d.items) {
    p.line(it.description.slice(0, 32));
    p.line(`  ${it.quantity} x        ${money(it.lineTotal)}`);
  }
  p.line("--------------------------------");
  p.line(`Subtotal:        ${money(d.subtotal)}`);
  if (d.taxTotal > 0) p.line(`Tax:             ${money(d.taxTotal)}`);
  if (d.discount > 0) p.line(`Discount:       -${money(d.discount)}`);
  if (d.oldGoldTotal > 0) p.line(`Old Gold:       -${money(d.oldGoldTotal)}`);
  p.bold(true).size(true).line(`TOTAL: ${money(d.grandTotal)}`).size(false).bold(false);
  if (d.method) p.line(`Paid (${d.method}): ${money(d.paidTotal)}`);
  p.align("center").line("--------------------------------");
  if (settings.footer_terms_en) p.line(settings.footer_terms_en);
  p.line("Shukria!").feed(4).cut();
  return p.buffer();
}

export function drawerKickBytes(): Buffer {
  return new EscPos().drawer().buffer();
}

// --- Send raw bytes to the printer ---------------------------------------------
export async function sendToPrinter(cfg: HardwareConfig, data: Buffer): Promise<void> {
  if (cfg.printerMode === "off" || cfg.printerPort === "SIMULATE") return; // no-op in sim
  if (cfg.printerMode === "network") {
    await new Promise<void>((resolve, reject) => {
      const sock = net.connect(cfg.printerTcpPort, cfg.printerHost, () => {
        sock.write(data, (e) => (e ? reject(e) : sock.end(() => resolve())));
      });
      sock.on("error", reject);
      sock.setTimeout(5000, () => { sock.destroy(); reject(new Error("Printer connection timed out")); });
    });
    return;
  }
  // serial
  const { SerialPort } = await import("serialport");
  await new Promise<void>((resolve, reject) => {
    const port = new SerialPort({ path: cfg.printerPort, baudRate: 9600 }, (err) => {
      if (err) return reject(new Error(`Printer open failed: ${err.message}`));
      port.write(data, (e) => {
        if (e) return reject(e);
        port.drain(() => port.close(() => resolve()));
      });
    });
    port.on("error", reject);
  });
}
