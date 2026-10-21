// Pixel-art ground textures, one 32x32 tileable layer per terrain type (plus a cliff face),
// generated from small colour ramps, dithered noise and a few strokes.

import { T } from '@pl/sim';

export const TEX = 32;
/** Extra layer used for steep slopes (cliff faces). */
export const LAYER_CLIFF_FACE = 14;
export const LAYERS = 16;

type Rgb = [number, number, number];
const hex = (c: number): Rgb => [(c >> 16) & 255, (c >> 8) & 255, c & 255];

function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value noise on the 32x32 grid. */
function tnoise(x: number, y: number, cell: number, seed: number): number {
  const n = TEX / cell;
  const gx = x / cell;
  const gy = y / cell;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;
  const h = (a: number, b: number): number => {
    const r = rng(((((a % n) + n) % n) * 73856093) ^ ((((b % n) + n) % n) * 19349663) ^ seed);
    return r();
  };
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = h(ix, iy);
  const b = h(ix + 1, iy);
  const c = h(ix, iy + 1);
  const d = h(ix + 1, iy + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

class Layer {
  data = new Uint8Array(TEX * TEX * 4);
  set(x: number, y: number, c: Rgb): void {
    const k = ((((y % TEX) + TEX) % TEX) * TEX + (((x % TEX) + TEX) % TEX)) * 4;
    this.data[k] = c[0];
    this.data[k + 1] = c[1];
    this.data[k + 2] = c[2];
    this.data[k + 3] = 255;
  }
  /** Base fill: noise picks between shades, dithered for a pixel-art look. */
  fill(shades: number[], cell: number, seed: number, bias = 0): void {
    for (let y = 0; y < TEX; y++) {
      for (let x = 0; x < TEX; x++) {
        const n = tnoise(x, y, cell, seed) * 0.75 + tnoise(x, y, cell / 2, seed + 7) * 0.25 + bias;
        const d = (BAYER[(y % 4) * 4 + (x % 4)]! / 16 - 0.5) * 0.28;
        const i = Math.max(0, Math.min(shades.length - 1, Math.floor((n + d) * shades.length)));
        this.set(x, y, hex(shades[i]!));
      }
    }
  }
  speckle(colors: number[], count: number, seed: number, size = 1): void {
    const r = rng(seed);
    for (let k = 0; k < count; k++) {
      const x = Math.floor(r() * TEX);
      const y = Math.floor(r() * TEX);
      const c = hex(colors[Math.floor(r() * colors.length)]!);
      for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) this.set(x + i, y + j, c);
    }
  }
}

export function buildTerrainTextures(): Uint8Array {
  const out = new Uint8Array(TEX * TEX * 4 * LAYERS);
  const put = (layer: number, l: Layer): void => out.set(l.data, layer * TEX * TEX * 4);

  // Grass: lush with blades and a few flowers.
  const grass = new Layer();
  grass.fill([0x3f6a2a, 0x4e7d32, 0x5c8f3a, 0x6c9e44], 8, 11);
  {
    const r = rng(5);
    for (let k = 0; k < 40; k++) {
      const x = Math.floor(r() * TEX);
      const y = Math.floor(r() * TEX);
      grass.set(x, y, hex(0x7fb052));
      grass.set(x, y + 1, hex(0x5c8f3a));
    }
    grass.speckle([0xf2e6a0, 0xe8d0e8, 0xffffff], 5, 9);
  }
  put(T.grass, grass);

  const dry = new Layer();
  dry.fill([0x7a7a3a, 0x8f8c44, 0xa39d50, 0xb5ac5c], 8, 12);
  dry.speckle([0xc8bc6c, 0x6a6a34], 40, 13);
  put(T.dry, dry);

  const dirt = new Layer();
  dirt.fill([0x6e5034, 0x7f5e3c, 0x8e6c46, 0x9c7a52], 8, 14);
  dirt.speckle([0xb49a74, 0x5a4028], 30, 15);
  put(T.dirt, dirt);

  const road = new Layer();
  road.fill([0x9a8466, 0xa8927a, 0xb6a088, 0xc4ae94], 16, 16);
  road.speckle([0x8a7458, 0xd2c0a4, 0x7a6a56], 50, 17);
  put(T.road, road);

  const sand = new Layer();
  sand.fill([0xc8b07c, 0xd4bc88, 0xe0c894, 0xeacfa0], 16, 18, 0.05);
  for (let y = 0; y < TEX; y += 6) for (let x = 0; x < TEX; x++) sand.set(x, y + Math.round(Math.sin(x * 0.4) * 1.5), hex(0xf0dcae));
  put(T.sand, sand);

  const forest = new Layer();
  forest.fill([0x26381e, 0x2f4524, 0x3a522a, 0x465e30], 6, 19);
  forest.speckle([0x6a5230, 0x7a6038, 0x1c2a16], 60, 20);
  put(T.forest, forest);

  const rough = new Layer();
  rough.fill([0x6e665a, 0x7c7366, 0x8a8172, 0x6a7a44], 6, 21);
  {
    const r = rng(22);
    for (let k = 0; k < 9; k++) {
      const x = Math.floor(r() * TEX);
      const y = Math.floor(r() * TEX);
      for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) rough.set(x + i, y + j, hex(j === 0 ? 0xb4aca0 : j === 2 ? 0x5a544c : 0x968e84));
    }
  }
  put(T.rough, rough);

  const marsh = new Layer();
  marsh.fill([0x3c4a32, 0x4a5a3a, 0x566a44, 0x4a6062], 8, 23);
  marsh.speckle([0x6a8c9a, 0x5a7a84], 30, 24, 2);
  put(T.marsh, marsh);

  const shallow = new Layer();
  shallow.fill([0x9a8a62, 0xa8986e, 0xb6a67a, 0x8a8a6a], 10, 25);
  put(T.shallow, shallow);

  const water = new Layer();
  water.fill([0x3a4636, 0x46523e, 0x505c46, 0x404c3e], 10, 26);
  put(T.water, water);

  const cliffTop = new Layer();
  cliffTop.fill([0x6a6258, 0x7a7064, 0x8a8070, 0x5a6a3a], 8, 27);
  cliffTop.speckle([0x9a9080, 0x4a443c, 0x6a8a44], 40, 28);
  put(T.cliff, cliffTop);

  // Masonry: offset rows of stone blocks.
  const wall = new Layer();
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const row = Math.floor(y / 8);
      const bx = (x + (row % 2) * 8) % 16;
      const edge = y % 8 === 0 || bx === 0;
      const n = tnoise(x, y, 8, 29);
      wall.set(x, y, hex(edge ? 0x5a544e : n > 0.6 ? 0xb0a898 : n > 0.3 ? 0x9e968a : 0x8c857a));
    }
  }
  put(T.wall, wall);

  const bridge = new Layer();
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const plank = y % 8 === 0 ? 0x3a2818 : (x + y * 3) % 11 === 0 ? 0x6a4a2e : (Math.floor(y / 8) % 2 ? 0x8a6236 : 0x7e5830);
      bridge.set(x, y, hex(plank));
    }
  }
  put(T.bridge, bridge);

  const field = new Layer();
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const stripe = x % 4;
      const n = tnoise(x, y, 4, 30);
      field.set(x, y, hex(stripe === 0 ? 0x8a7a30 : n > 0.5 ? 0xd8c25a : 0xc6ae4a));
    }
  }
  put(T.field, field);

  // Cliff face: horizontal strata with cracks.
  const face = new Layer();
  for (let y = 0; y < TEX; y++) {
    const band = Math.floor((y + Math.round(tnoise(0, y, 8, 31) * 3)) / 5) % 3;
    for (let x = 0; x < TEX; x++) {
      const n = tnoise(x, y, 4, 32 + band);
      const c = band === 0 ? (n > 0.5 ? 0x8a7e6e : 0x7a6e60) : band === 1 ? (n > 0.5 ? 0x6e6458 : 0x5e554a) : n > 0.5 ? 0x9a8e7c : 0x84786a;
      face.set(x, y, hex(c));
    }
  }
  for (let k = 0; k < 6; k++) {
    const x = (k * 11) % TEX;
    for (let y = 0; y < 10; y++) face.set(x + (y % 3 === 0 ? 1 : 0), (k * 7 + y) % TEX, hex(0x3e3830));
  }
  put(LAYER_CLIFF_FACE, face);
  return out;
}
