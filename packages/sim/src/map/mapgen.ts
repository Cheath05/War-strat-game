// Battle maps are built by small deterministic "map scripts" (src/data/maps) that paint
// terrain and heights with the Painter below. A map is rebuilt from (id, seed, params) on
// every computer instead of being stored in the world, so snapshots stay small.

import { TILE } from '../constants';
import { clamp, smooth } from '../math/det';
import { hash01 } from '../math/rng';
import type { MapRef } from '../types';
import type { PropDef, ZoneDef } from '../data/types';
import { MOVE, T, TERRAIN, passMask } from './terrain';

export interface BattleMap {
  id: string;
  name: string;
  theme: string;
  /** Size in tiles. */
  w: number;
  h: number;
  /** Size in metres. */
  wm: number;
  hm: number;
  /** Terrain id per tile (w * h). */
  ter: Uint8Array;
  /** Height in metres per tile corner ((w + 1) * (h + 1)). */
  hgt: Float64Array;
  /** Movement mask per tile (MOVE bits). */
  pass: Uint8Array;
  /** Distance in tiles to the nearest tile foot soldiers can't enter (for column formations). */
  clear: Uint8Array;
  /** Like clear, but water and bog count as blocked too: formations on dry ground keep out of it. */
  dryClear: Uint8Array;
  /** Height of the top of each lifted wall or cliff tile (0 elsewhere): walls are drawn as blocks. */
  top: Float64Array;
  props: PropDef[];
  zones: Record<string, ZoneDef>;
  points: Record<string, { x: number; y: number }>;
  /** Named waypoint routes in metres, flattened [x0, y0, ...] (AI directives such as flank marches). */
  routes: Record<string, number[]>;
  /** Water surface height in metres. */
  sea: number;
}

export interface MapScript {
  id: string;
  name: string;
  theme: string;
  /** Size in metres (multiples of TILE). */
  w: number;
  h: number;
  build(p: Painter, params: Record<string, number>): void;
}

/** Smooth value noise in [0, 1), deterministic for (x, y, scale, seed). */
export function vnoise(x: number, y: number, scale: number, seed: number): number {
  const gx = x / scale;
  const gy = y / scale;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash01(ix, iy, seed);
  const b = hash01(ix + 1, iy, seed);
  const c = hash01(ix, iy + 1, seed);
  const d = hash01(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Fractal noise: a few octaves of vnoise. */
export function fbm(x: number, y: number, scale: number, seed: number, octaves = 3): number {
  let amp = 1;
  let sum = 0;
  let norm = 0;
  let s = scale;
  for (let o = 0; o < octaves; o++) {
    sum += vnoise(x, y, s, seed + o * 101) * amp;
    norm += amp;
    amp *= 0.5;
    s *= 0.5;
  }
  return sum / norm;
}

/** Paints terrain and heights in metre coordinates onto the tile grid. */
export class Painter {
  readonly w: number;
  readonly h: number;
  readonly wm: number;
  readonly hm: number;
  readonly ter: Uint8Array;
  readonly hgt: Float64Array;
  readonly props: PropDef[] = [];
  readonly zones: Record<string, ZoneDef> = {};
  readonly points: Record<string, { x: number; y: number }> = {};
  readonly routes: Record<string, number[]> = {};
  sea = 0;
  /** How much lift() raised each corner (so walkable ground can be put back down). */
  readonly lifted = new Map<number, number>();
  private rngState: number;

  constructor(
    wm: number,
    hm: number,
    readonly seed: number,
  ) {
    this.w = Math.round(wm / TILE);
    this.h = Math.round(hm / TILE);
    this.wm = this.w * TILE;
    this.hm = this.h * TILE;
    this.ter = new Uint8Array(this.w * this.h);
    this.hgt = new Float64Array((this.w + 1) * (this.h + 1));
    this.rngState = seed | 0;
  }

  /** Deterministic random in [0, 1) for map building (separate from the battle RNG). */
  rand(): number {
    this.rngState = (this.rngState + 0x6d2b79f5) | 0;
    let t = this.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  noise(x: number, y: number, scale: number, salt = 0): number {
    return fbm(x, y, scale, this.seed + salt * 7919);
  }

  /** Tile centre in metres. */
  cx(i: number): number {
    return (i + 0.5) * TILE;
  }
  cy(j: number): number {
    return (j + 0.5) * TILE;
  }

  get(i: number, j: number): number {
    return this.ter[j * this.w + i]!;
  }

  set(i: number, j: number, t: number): void {
    if (i >= 0 && j >= 0 && i < this.w && j < this.h) this.ter[j * this.w + i] = t;
  }

  terrainAt(x: number, y: number): number {
    const i = clamp(Math.floor(x / TILE), 0, this.w - 1);
    const j = clamp(Math.floor(y / TILE), 0, this.h - 1);
    return this.get(i, j);
  }

  fill(t: number): void {
    this.ter.fill(t);
  }

  /** Calls fn for every tile whose centre is inside the metre rectangle. */
  eachTile(x0: number, y0: number, x1: number, y1: number, fn: (i: number, j: number, x: number, y: number) => void): void {
    const i0 = clamp(Math.floor(Math.min(x0, x1) / TILE), 0, this.w - 1);
    const i1 = clamp(Math.floor(Math.max(x0, x1) / TILE), 0, this.w - 1);
    const j0 = clamp(Math.floor(Math.min(y0, y1) / TILE), 0, this.h - 1);
    const j1 = clamp(Math.floor(Math.max(y0, y1) / TILE), 0, this.h - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) fn(i, j, this.cx(i), this.cy(j));
  }

  rect(x0: number, y0: number, x1: number, y1: number, t: number): void {
    this.eachTile(x0, y0, x1, y1, (i, j) => this.set(i, j, t));
  }

  /** Disc with an optionally ragged (noisy) edge. */
  circle(cx: number, cy: number, r: number, t: number, ragged = 0): void {
    this.eachTile(cx - r - ragged, cy - r - ragged, cx + r + ragged, cy + r + ragged, (i, j, x, y) => {
      const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      const edge = r + (ragged ? (this.noise(x, y, 12, 3) - 0.5) * 2 * ragged : 0);
      if (d <= edge) this.set(i, j, t);
    });
  }

  /** Filled polygon (metre points, flattened). */
  poly(pts: number[], t: number): void {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let k = 0; k < pts.length; k += 2) {
      x0 = Math.min(x0, pts[k]!);
      x1 = Math.max(x1, pts[k]!);
      y0 = Math.min(y0, pts[k + 1]!);
      y1 = Math.max(y1, pts[k + 1]!);
    }
    this.eachTile(x0, y0, x1, y1, (i, j, x, y) => {
      if (pointInPoly(x, y, pts)) this.set(i, j, t);
    });
  }

  /** Thick polyline with an optionally ragged edge. */
  stroke(pts: number[], width: number, t: number, ragged = 0, only?: number[]): void {
    const r = width / 2;
    for (let k = 0; k + 3 < pts.length; k += 2) {
      const ax = pts[k]!;
      const ay = pts[k + 1]!;
      const bx = pts[k + 2]!;
      const by = pts[k + 3]!;
      const pad = r + ragged;
      this.eachTile(Math.min(ax, bx) - pad, Math.min(ay, by) - pad, Math.max(ax, bx) + pad, Math.max(ay, by) + pad, (i, j, x, y) => {
        const d = distToSeg(x, y, ax, ay, bx, by);
        const edge = r + (ragged ? (this.noise(x, y, 10, 5) - 0.5) * 2 * ragged : 0);
        if (d <= edge && (!only || only.includes(this.get(i, j)))) this.set(i, j, t);
      });
    }
  }

  /** Paints t where fractal noise exceeds threshold (and the filter allows). */
  noiseFill(t: number, scale: number, threshold: number, salt: number, filter?: (cur: number, x: number, y: number) => boolean): void {
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const x = this.cx(i);
        const y = this.cy(j);
        if (this.noise(x, y, scale, salt) > threshold && (!filter || filter(this.get(i, j), x, y))) this.set(i, j, t);
      }
    }
  }

  /** Adds fn(x, y) metres to every corner height. */
  raise(fn: (x: number, y: number) => number): void {
    const W = this.w + 1;
    for (let j = 0; j <= this.h; j++) {
      for (let i = 0; i <= this.w; i++) {
        this.hgt[j * W + i] = this.hgt[j * W + i]! + fn(i * TILE, j * TILE);
      }
    }
  }

  /** A smooth round hill. */
  hill(cx: number, cy: number, r: number, h: number): void {
    this.raise((x, y) => {
      const d2 = ((x - cx) * (x - cx) + (y - cy) * (y - cy)) / (r * r);
      if (d2 >= 1) return 0;
      const f = 1 - d2;
      return h * f * f;
    });
  }

  /** Gentle rolling ground from noise, amplitude in metres. */
  roll(amp: number, scale: number, salt = 11): void {
    this.raise((x, y) => (this.noise(x, y, scale, salt) - 0.5) * 2 * amp);
  }

  /** Sets corner heights inside tiles of terrain t to at most h (water beds). */
  sink(t: number, h: number): void {
    const W = this.w + 1;
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        if (this.get(i, j) !== t) continue;
        for (const [di, dj] of CORNERS) {
          const k = (j + dj) * W + i + di;
          this.hgt[k] = Math.min(this.hgt[k]!, h);
        }
      }
    }
  }

  /**
   * Raises corners of tiles of terrain t to at least h metres (a number, or a function of the
   * corner's position): cliffs and walls. Corners shared with ground soldiers can walk on are
   * put back down when the map is finished, so nobody stands on the slope of a wall.
   */
  lift(t: number, h: number | ((x: number, y: number) => number)): void {
    const W = this.w + 1;
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        if (this.get(i, j) !== t) continue;
        for (const [di, dj] of CORNERS) {
          const k = (j + dj) * W + i + di;
          const before = this.hgt[k]!;
          const to = typeof h === 'number' ? h : h((i + di) * TILE, (j + dj) * TILE);
          if (to <= before) continue;
          this.hgt[k] = to;
          this.lifted.set(k, (this.lifted.get(k) ?? 0) + (to - before));
        }
      }
    }
  }

  zone(name: string, x0: number, y0: number, x1: number, y1: number, dx = 0, dy = -1): void {
    this.zones[name] = { x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1), dx, dy };
  }

  point(name: string, x: number, y: number): void {
    this.points[name] = { x, y };
  }

  route(name: string, pts: number[]): void {
    this.routes[name] = pts.slice();
  }

  prop(kind: string, x: number, y: number, s = 1): void {
    this.props.push({ kind, x, y, s, v: Math.floor(this.rand() * 1000) });
  }

  /** Scatters props over tiles of the given terrains with a chance per tile. */
  scatter(kind: string, chancePerTile: number, on: number[], sMin = 0.85, sMax = 1.2): void {
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        if (!on.includes(this.get(i, j))) continue;
        if (this.rand() >= chancePerTile) continue;
        const x = this.cx(i) + (this.rand() - 0.5) * TILE * 0.8;
        const y = this.cy(j) + (this.rand() - 0.5) * TILE * 0.8;
        this.prop(kind, x, y, sMin + (sMax - sMin) * this.rand());
      }
    }
  }
}

const CORNERS: [number, number][] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

export function pointInPoly(x: number, y: number, pts: number[]): boolean {
  let inside = false;
  const n = pts.length / 2;
  for (let a = 0, b = n - 1; a < n; b = a++) {
    const xa = pts[a * 2]!;
    const ya = pts[a * 2 + 1]!;
    const xb = pts[b * 2]!;
    const yb = pts[b * 2 + 1]!;
    if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside;
  }
  return inside;
}

export function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax;
  const vy = by - ay;
  const l2 = vx * vx + vy * vy;
  let t = l2 > 0 ? ((px - ax) * vx + (py - ay) * vy) / l2 : 0;
  t = clamp(t, 0, 1);
  const dx = px - (ax + vx * t);
  const dy = py - (ay + vy * t);
  return Math.sqrt(dx * dx + dy * dy);
}

const SCRIPTS = new Map<string, MapScript>();
const BUILT = new Map<string, BattleMap>();

export function registerMap(script: MapScript): void {
  SCRIPTS.set(script.id, script);
}

export function mapScript(id: string): MapScript {
  const s = SCRIPTS.get(id);
  if (!s) throw new Error(`Unknown map: ${id}`);
  return s;
}

export function listMaps(): MapScript[] {
  return [...SCRIPTS.values()];
}

/** Builds (or returns the cached) map for a reference. Pure function of the reference. */
export function buildMap(ref: MapRef): BattleMap {
  const key = `${ref.id}|${ref.seed}|${JSON.stringify(ref.params)}`;
  const hit = BUILT.get(key);
  if (hit) return hit;
  const script = mapScript(ref.id);
  const p = new Painter(script.w, script.h, ref.seed);
  script.build(p, ref.params);
  const map = finish(script, p);
  if (BUILT.size > 8) BUILT.clear();
  BUILT.set(key, map);
  return map;
}

function finish(script: MapScript, p: Painter): BattleMap {
  const { w, h } = p;
  const pass = new Uint8Array(w * h);
  for (let k = 0; k < w * h; k++) pass[k] = passMask(p.ter[k]!);
  // Clearance: Chebyshev distance (tiles) to the nearest tile foot soldiers can't enter.
  const clear = distanceTo(w, h, (k) => !(pass[k]! & MOVE.foot));
  const dryClear = distanceTo(w, h, (k) => !(pass[k]! & MOVE.foot) || !!TERRAIN[p.ter[k]!]!.wet);
  // Walkable ground is never lifted: corners shared with a tile foot soldiers can enter keep
  // the ground height, and walls and cliffs rise from their own corners. Remember how high
  // each lifted tile reached first: thin walls lose their slope and are drawn as blocks.
  const W = w + 1;
  const top = new Float64Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = j * w + i;
      if (pass[k]! & MOVE.foot) continue;
      let raised = false;
      let mx = -1e9;
      for (const [di, dj] of CORNERS) {
        const c = (j + dj) * W + i + di;
        if (p.lifted.has(c)) raised = true;
        mx = Math.max(mx, p.hgt[c]!);
      }
      if (raised) top[k] = mx;
    }
  }
  for (const [c, add] of p.lifted) {
    const ci = c % W;
    const cj = (c - ci) / W;
    let walkable = false;
    for (let dj = -1; dj <= 0 && !walkable; dj++) {
      for (let di = -1; di <= 0; di++) {
        const ti = ci + di;
        const tj = cj + dj;
        if (ti >= 0 && tj >= 0 && ti < w && tj < h && pass[tj * w + ti]! & MOVE.foot) {
          walkable = true;
          break;
        }
      }
    }
    if (walkable) p.hgt[c] = p.hgt[c]! - add;
  }
  // Dry ground stays above the water surface: only real water and its shore look wet.
  for (let cj = 0; cj <= h; cj++) {
    for (let ci = 0; ci <= w; ci++) {
      let wet = false;
      for (let dj = -1; dj <= 0 && !wet; dj++) {
        for (let di = -1; di <= 0; di++) {
          const ti = ci + di;
          const tj = cj + dj;
          if (ti >= 0 && tj >= 0 && ti < w && tj < h && TERRAIN[p.ter[tj * w + ti]!]!.wet) {
            wet = true;
            break;
          }
        }
      }
      if (!wet) p.hgt[cj * W + ci] = Math.max(p.hgt[cj * W + ci]!, p.sea + 0.15);
    }
  }
  return {
    id: script.id,
    name: script.name,
    theme: script.theme,
    w,
    h,
    wm: p.wm,
    hm: p.hm,
    ter: p.ter,
    hgt: p.hgt,
    pass,
    clear,
    dryClear,
    top,
    props: p.props,
    zones: p.zones,
    points: p.points,
    routes: p.routes,
    sea: p.sea,
  };
}

/** Chebyshev distance (tiles, capped at 255) from every tile to the nearest tile where blocked(k). */
function distanceTo(w: number, h: number, blocked: (k: number) => boolean): Uint8Array {
  const out = new Uint8Array(w * h).fill(255);
  const queue: number[] = [];
  for (let k = 0; k < w * h; k++) {
    if (blocked(k)) {
      out[k] = 0;
      queue.push(k);
    }
  }
  for (let qi = 0; qi < queue.length; qi++) {
    const k = queue[qi]!;
    const i = k % w;
    const j = (k - i) / w;
    const d = out[k]! + 1;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
        const nk = nj * w + ni;
        if (out[nk]! > d) {
          out[nk] = d;
          queue.push(nk);
        }
      }
    }
  }
  return out;
}

// --- Queries used by the simulation -------------------------------------------------------

export function tileAt(map: BattleMap, x: number, y: number): number {
  const i = clamp(Math.floor(x / TILE), 0, map.w - 1);
  const j = clamp(Math.floor(y / TILE), 0, map.h - 1);
  return j * map.w + i;
}

export function terrainAt(map: BattleMap, x: number, y: number): number {
  return map.ter[tileAt(map, x, y)]!;
}

export function passableAt(map: BattleMap, x: number, y: number, mask: number): boolean {
  if (x < 0 || y < 0 || x >= map.wm || y >= map.hm) return false;
  return (map.pass[tileAt(map, x, y)]! & mask) !== 0;
}

/** Ground height in metres, bilinear between tile corners. */
export function heightAt(map: BattleMap, x: number, y: number): number {
  const fx = clamp(x / TILE, 0, map.w - 1e-6);
  const fy = clamp(y / TILE, 0, map.h - 1e-6);
  const i = Math.floor(fx);
  const j = Math.floor(fy);
  const tx = fx - i;
  const ty = fy - j;
  const W = map.w + 1;
  const a = map.hgt[j * W + i]!;
  const b = map.hgt[j * W + i + 1]!;
  const c = map.hgt[(j + 1) * W + i]!;
  const d = map.hgt[(j + 1) * W + i + 1]!;
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

/** Speed multiplier for a movement class index (0 foot, 1 horse, 2 large) at a point. */
export function terrainSpeed(map: BattleMap, x: number, y: number, cls: number): number {
  return TERRAIN[terrainAt(map, x, y)]!.speed[cls]!;
}

export function clearanceAt(map: BattleMap, x: number, y: number): number {
  return map.clear[tileAt(map, x, y)]!;
}

/** Clearance to the nearest blocked, wet or boggy tile. */
export function dryClearanceAt(map: BattleMap, x: number, y: number): number {
  return map.dryClear[tileAt(map, x, y)]!;
}

/** Dry ground foot soldiers can stand on (not water, shallows or marsh). */
export function dryAt(map: BattleMap, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= map.wm || y >= map.hm) return false;
  const k = tileAt(map, x, y);
  return (map.pass[k]! & MOVE.foot) !== 0 && !TERRAIN[map.ter[k]!]!.wet;
}

/**
 * True when the straight line a→b is passable for mask and nowhere slower going than
 * minSpeed for that movement class: the shortcut a unit may take without wading through
 * shallows or bog it could walk round.
 */
export function easyLine(map: BattleMap, ax: number, ay: number, bx: number, by: number, mask: number, ci: number, minSpeed: number): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.ceil(d / (TILE * 0.5)));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const k = tileAt(map, ax + dx * t, ay + dy * t);
    const x = ax + dx * t;
    const y = ay + dy * t;
    if (x < 0 || y < 0 || x >= map.wm || y >= map.hm || !(map.pass[k]! & mask)) return false;
    if (TERRAIN[map.ter[k]!]!.speed[ci]! < minSpeed) return false;
  }
  return true;
}

/**
 * Travel cost (metres divided by terrain speed) of the straight line a→b; Infinity if it's
 * blocked, or (with dry) if it enters water or bog at all.
 */
export function lineCost(map: BattleMap, ax: number, ay: number, bx: number, by: number, mask: number, ci: number, dry = false): number {
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.ceil(d / (TILE * 0.5)));
  let cost = 0;
  for (let s = 0; s < steps; s++) {
    const t = (s + 0.5) / steps;
    const x = ax + dx * t;
    const y = ay + dy * t;
    if (x < 0 || y < 0 || x >= map.wm || y >= map.hm) return Infinity;
    const k = tileAt(map, x, y);
    if (!(map.pass[k]! & mask)) return Infinity;
    const info = TERRAIN[map.ter[k]!]!;
    if (dry && info.wet) return Infinity;
    cost += d / steps / (info.speed[ci]! * (info.wet ? WET_PENALTY : 1));
  }
  return cost;
}

/** Extra cost of wading: paths go round shallows and bog unless crossing them is worth it. */
export const WET_PENALTY = 0.6;

/** True when the straight line a→b stays on tiles passable for mask (samples every half tile). */
export function lineClear(map: BattleMap, ax: number, ay: number, bx: number, by: number, mask: number): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.ceil(d / (TILE * 0.5)));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    if (!passableAt(map, ax + dx * t, ay + dy * t, mask)) return false;
  }
  return true;
}

/** Fraction 0..1 for how open the ground is around (x, y): used to place props and zones. */
export function slopeAt(map: BattleMap, x: number, y: number): number {
  const h0 = heightAt(map, x, y);
  const hx = heightAt(map, x + TILE, y);
  const hy = heightAt(map, x, y + TILE);
  return smooth(0, 1, Math.sqrt((hx - h0) * (hx - h0) + (hy - h0) * (hy - h0)) / TILE);
}

export { T };
