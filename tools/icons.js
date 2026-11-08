// Draws the app icon (white rupee sign on violet) as PNGs with no dependencies.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, inside){
  const SS = 4, raw = Buffer.alloc((size * 4 + 1) * size);
  const bg = [0x4a, 0x3e, 0x9e], fg = [255, 255, 255];
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        if (inside((x + (sx + .5) / SS) / size, (y + (sy + .5) / SS) / size)) hit++;
      }
      const a = hit / (SS * SS), o = y * (size * 4 + 1) + 1 + x * 4;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(bg[i] + (fg[i] - bg[i]) * a);
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
function segDist(px, py, ax, ay, bx, by){
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
// Rupee sign, roughly within 0.28..0.72 x 0.22..0.80
function rupee(u, v){
  const T = 0.052;
  if (v >= 0.24 && v <= 0.24 + T && u >= 0.30 && u <= 0.70) return true;          // top bar
  if (v >= 0.375 && v <= 0.375 + T && u >= 0.30 && u <= 0.70) return true;        // middle bar
  const cx = 0.40, cy = 0.3925, r = 0.1525 - T / 2;
  const d = Math.hypot(u - cx, v - cy);
  if (u >= cx && Math.abs(d - r) <= T / 2) return true;                           // bowl
  if (Math.abs(v - (cy + r)) <= T / 2 && u >= 0.30 && u <= cx) return true;        // bowl foot
  if (segDist(u, v, 0.335, cy + r, 0.64, 0.80) <= T * 0.58) return true;           // leg
  return false;
}
const out = path.join(__dirname, "..", "icons");
fs.mkdirSync(out, {recursive: true});
for (const [name, size] of [["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]]) {
  fs.writeFileSync(path.join(out, name), png(size, rupee));
  console.log("wrote", name);
}
