// Renders unit sprites to a PNG for reviewing art without a browser:
//   npx tsx tools/sprite-sheet.ts out.png [colour] unitId...
// Each unit is one row: front, side and back standing, then side and front striking,
// side walking and fallen, scaled up four times on grass.

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { unitType } from '@pl/sim';
import { buildAtlas, frameKey, spriteKey } from '../packages/client/src/game/art/atlas';
import type { Pose, View } from '../packages/client/src/game/art/doll';
import { buildPaletteData, colorOf } from '../packages/client/src/game/art/palette';

const SHOTS: [View, Pose][] = [
  [0, 'idle0'],
  [2, 'idle0'],
  [1, 'idle0'],
  [2, 'atk1'],
  [0, 'atk1'],
  [2, 'walk0'],
  [0, 'dead'],
];

const [out, palArg, ...ids] = process.argv.slice(2);
if (!out || !ids.length) throw new Error('usage: sprite-sheet.ts out.png colour unitId...');
const pal = Number(palArg ?? 0);
const S = 4;
const cell = 66;
const W = SHOTS.length * cell * S;
const H = ids.length * cell * S;
const rgba = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) rgba.set([92, 143, 58, 255], i * 4);
const atlas = buildAtlas();
const palette = buildPaletteData();
ids.forEach((id, row) => {
  const t = unitType(id);
  SHOTS.forEach(([view, pose], col) => {
    const px = atlas.cells.get(frameKey(spriteKey(t), view, pose));
    if (!px) return;
    for (let y = 0; y < px.h; y++) {
      for (let x = 0; x < px.w; x++) {
        const idx = px.data[y * px.w + x]!;
        if (!idx) continue;
        const [r, g, b] = colorOf(palette, pal, idx);
        for (let dy = 0; dy < S; dy++) {
          for (let dx = 0; dx < S; dx++) {
            const k = (((row * cell + y) * S + dy) * W + (col * cell + x) * S + dx) * 4;
            rgba[k] = r;
            rgba[k + 1] = g;
            rgba[k + 2] = b;
          }
        }
      }
    }
  });
});

// A minimal PNG: one IDAT of filter-0 scanlines.
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
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr.set([8, 6, 0, 0, 0], 8);
const raw = Buffer.alloc(H * (W * 4 + 1));
for (let y = 0; y < H; y++) Buffer.from(rgba.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1);
writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log(`wrote ${out} (${W}x${H})`);
