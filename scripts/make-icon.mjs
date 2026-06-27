/**
 * Generate the PakGold app icon (build/icon.ico, .png, .svg) with no image
 * libraries — a gold gem on deep navy. Run: node scripts/make-icon.mjs
 */
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

const S = 256;
const cx = 128, cy = 134;

// --- colours (RGB) ---
const NAVY = [11, 17, 32];
const GOLD = [212, 175, 55];
const GOLD_HI = [232, 205, 96];
const GOLD_LO = [161, 128, 38];

function roundedInside(x, y, r = 34) {
  // rounded square covering the full canvas with radius r
  const minx = 0, miny = 0, maxx = S - 1, maxy = S - 1;
  const dx = Math.max(minx + r - x, 0, x - (maxx - r));
  const dy = Math.max(miny + r - y, 0, y - (maxy - r));
  return dx * dx + dy * dy <= r * r;
}

function pixel(x, y) {
  if (!roundedInside(x, y)) return [0, 0, 0, 0]; // transparent corners

  // Gem: a faceted diamond (rhombus) centred slightly low.
  const halfW = 74, halfH = 94;
  const d = Math.abs(x - cx) / halfW + Math.abs(y - cy) / halfH;
  if (d <= 1) {
    const girdle = cy - 34; // "table" line near the top of the gem
    let c;
    if (y < girdle) {
      // crown / table — brighter, with a centre highlight
      c = Math.abs(x - cx) < 22 ? GOLD_HI : GOLD;
    } else {
      // pavilion — left facet a touch darker for depth
      c = x < cx ? GOLD_LO : GOLD;
    }
    return [...c, 255];
  }
  return [...NAVY, 255];
}

// --- encode RGBA -> PNG ---
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function makePng() {
  const raw = Buffer.alloc((S * 4 + 1) * S);
  let o = 0;
  for (let y = 0; y < S; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < S; x++) {
      const [r, g, b, a] = pixel(x, y);
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0);
  ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- wrap PNG into an ICO (PNG-compressed entry, valid on modern Windows) ---
function makeIco(png) {
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2); // type: icon
  dir.writeUInt16LE(1, 4); // count
  const entry = Buffer.alloc(16);
  entry[0] = 0; // width 256 (0 = 256)
  entry[1] = 0; // height 256
  entry[2] = 0; entry[3] = 0;
  entry.writeUInt16LE(1, 4);  // planes
  entry.writeUInt16LE(32, 6); // bpp
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12); // offset = 6 + 16
  return Buffer.concat([dir, entry, png]);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="34" fill="#0B1120"/>
  <polygon points="128,40 202,100 128,228 54,100" fill="#D4AF37"/>
  <polygon points="128,40 202,100 54,100" fill="#E8CD60"/>
  <line x1="54" y1="100" x2="202" y2="100" stroke="#A18026" stroke-width="3"/>
  <line x1="128" y1="40" x2="128" y2="228" stroke="#A18026" stroke-width="2" opacity="0.5"/>
</svg>`;

const dir = path.join(process.cwd(), "build");
fs.mkdirSync(dir, { recursive: true });
const png = makePng();
fs.writeFileSync(path.join(dir, "icon.png"), png);
fs.writeFileSync(path.join(dir, "icon.ico"), makeIco(png));
fs.writeFileSync(path.join(dir, "icon.svg"), svg);
console.log("✅ Wrote build/icon.png, build/icon.ico, build/icon.svg");
