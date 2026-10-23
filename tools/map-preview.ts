// Renders a map from above to a PNG: terrain colours shaded by height, deployment zones
// outlined in white and named points marked in red. For designing maps without a browser.
//   npx tsx tools/map-preview.ts out.png battlefield '{"river":1,"deep":1,"bridge":1}' [seed] [scale]

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { TERRAIN, buildMap, heightAt } from '@pl/sim';

const [out = 'map.png', id = 'battlefield', paramsJson = '{}', seedS = '1', scaleS = '2'] = process.argv.slice(2);
const map = buildMap({ id, seed: Number(seedS), params: JSON.parse(paramsJson) as Record<string, number> });
const scale = Number(scaleS);
const W = Math.round(map.wm / scale);
const H = Math.round(map.hm / scale);
const px = new Uint8Array(W * H * 3);

const put = (x: number, y: number, r: number, g: number, b: number): void => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const k = (y * W + x) * 3;
  px[k] = r;
  px[k + 1] = g;
  px[k + 2] = b;
};

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const mx = (x + 0.5) * scale;
    const my = (y + 0.5) * scale;
    const t = map.ter[Math.floor(my / 2) * map.w + Math.floor(mx / 2)]!;
    const c = TERRAIN[t]!.color;
    // Light from the north-west: slopes facing it brighter.
    const h = heightAt(map, mx, my);
    const hn = heightAt(map, Math.max(0, mx - 2), Math.max(0, my - 2));
    const top = map.top[Math.floor(my / 2) * map.w + Math.floor(mx / 2)]!;
    const shade = Math.max(0.55, Math.min(1.35, 1 + (h - hn) * 0.12 + h * 0.015 + (top > 0 ? 0.25 : 0)));
    put(x, y, Math.min(255, ((c >> 16) & 255) * shade), Math.min(255, ((c >> 8) & 255) * shade), Math.min(255, (c & 255) * shade));
  }
}
for (const z of Object.values(map.zones)) {
  const x0 = Math.round(z.x0 / scale);
  const x1 = Math.round(z.x1 / scale);
  const y0 = Math.round(z.y0 / scale);
  const y1 = Math.round(z.y1 / scale);
  for (let x = x0; x <= x1; x++) {
    put(x, y0, 255, 255, 255);
    put(x, y1, 255, 255, 255);
  }
  for (let y = y0; y <= y1; y++) {
    put(x0, y, 255, 255, 255);
    put(x1, y, 255, 255, 255);
  }
}
for (const p of Object.values(map.points)) {
  for (let d = -2; d <= 2; d++) {
    put(Math.round(p.x / scale) + d, Math.round(p.y / scale), 230, 40, 40);
    put(Math.round(p.x / scale), Math.round(p.y / scale) + d, 230, 40, 40);
  }
}

const raw = Buffer.alloc(H * (W * 3 + 1));
for (let y = 0; y < H; y++) {
  raw[y * (W * 3 + 1)] = 0;
  Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf: Buffer): number => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer): Buffer => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;
ihdr[9] = 2;
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log(`${map.name} ${map.wm}x${map.hm} m -> ${out} (${W}x${H}); zones: ${Object.keys(map.zones).join(', ')}`);
