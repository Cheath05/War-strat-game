// A* on the tile grid with terrain costs, then string-pulled into a few waypoints.
// Deterministic: the open set breaks ties by insertion order.

import { TILE } from '../constants';
import type { BattleMap } from './mapgen';
import { WET_PENALTY, easyLine, lineCost, terrainAt } from './mapgen';
import { MOVE, TERRAIN } from './terrain';

const SQRT2 = 1.4142135623730951;

/** Movement class index for TERRAIN speeds (0 foot, 1 horse, 2 large) from a MOVE mask. */
export function classIndex(mask: number): number {
  return mask === MOVE.large ? 2 : mask === MOVE.horse ? 1 : 0;
}

interface Scratch {
  g: Float64Array;
  came: Int32Array;
  stamp: Uint32Array;
  closed: Uint32Array;
  heapN: Int32Array;
  heapF: Float64Array;
  heapO: Float64Array;
  gen: number;
}

const SCRATCH = new WeakMap<BattleMap, Scratch>();

function scratch(map: BattleMap): Scratch {
  let s = SCRATCH.get(map);
  if (!s) {
    const n = map.w * map.h;
    s = {
      g: new Float64Array(n),
      came: new Int32Array(n),
      stamp: new Uint32Array(n),
      closed: new Uint32Array(n),
      heapN: new Int32Array(n * 2),
      heapF: new Float64Array(n * 2),
      heapO: new Float64Array(n * 2),
      gen: 0,
    };
    SCRATCH.set(map, s);
  }
  return s;
}

function grow(s: Scratch): void {
  const n = s.heapN.length * 2;
  const hn = new Int32Array(n);
  const hf = new Float64Array(n);
  const ho = new Float64Array(n);
  hn.set(s.heapN);
  hf.set(s.heapF);
  ho.set(s.heapO);
  s.heapN = hn;
  s.heapF = hf;
  s.heapO = ho;
}

function nearestPassable(map: BattleMap, i: number, j: number, mask: number, maxR = 40): number {
  const { w, h } = map;
  if (i >= 0 && j >= 0 && i < w && j < h && map.pass[j * w + i]! & mask) return j * w + i;
  for (let r = 1; r <= maxR; r++) {
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (Math.abs(di) !== r && Math.abs(dj) !== r) continue;
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
        if (map.pass[nj * w + ni]! & mask) return nj * w + ni;
      }
    }
  }
  return -1;
}

/**
 * Path from (sx, sy) to (gx, gy) in metres for a movement mask. Returns waypoints
 * flattened [x0, y0, x1, y1, ...] ending at the goal (or the closest reachable point),
 * excluding the start. Empty when the start is enclosed.
 */
export function findPath(map: BattleMap, sx: number, sy: number, gx: number, gy: number, mask: number, maxExpand = 40000): number[] {
  const { w, h } = map;
  const ci = classIndex(mask);
  const startK = nearestPassable(map, Math.floor(sx / TILE), Math.floor(sy / TILE), mask);
  let goalK = nearestPassable(map, Math.floor(gx / TILE), Math.floor(gy / TILE), mask);
  if (startK < 0 || goalK < 0) return [];
  const goalExact = goalK === (Math.floor(gy / TILE) * w + Math.floor(gx / TILE));
  let goalX = goalExact ? gx : ((goalK % w) + 0.5) * TILE;
  let goalY = goalExact ? gy : (Math.floor(goalK / w) + 0.5) * TILE;
  // Straight there when nothing's in the way and the line doesn't wade through water or bog
  // that neither end is already in.
  const easy = Math.min(0.75, TERRAIN[terrainAt(map, sx, sy)]!.speed[ci]!, TERRAIN[terrainAt(map, goalX, goalY)]!.speed[ci]!);
  if (easyLine(map, sx, sy, goalX, goalY, mask, ci, easy)) return [goalX, goalY];

  const s = scratch(map);
  s.gen = (s.gen + 1) >>> 0;
  if (s.gen === 0) {
    s.stamp.fill(0);
    s.closed.fill(0);
    s.gen = 1;
  }
  const gen = s.gen;
  const gi = goalK % w;
  const gj = (goalK - gi) / w;
  const minCost = TILE / 1.15;
  const heur = (k: number): number => {
    const i = k % w;
    const j = (k - i) / w;
    const di = Math.abs(i - gi);
    const dj = Math.abs(j - gj);
    return (Math.max(di, dj) + (SQRT2 - 1) * Math.min(di, dj)) * minCost;
  };

  let heapSize = 0;
  let order = 0;
  const push = (k: number, f: number): void => {
    if (heapSize >= s.heapN.length) grow(s);
    let c = heapSize++;
    const o = order++;
    while (c > 0) {
      const p = (c - 1) >> 1;
      const pf = s.heapF[p]!;
      if (pf < f || (pf === f && s.heapO[p]! < o)) break;
      s.heapN[c] = s.heapN[p]!;
      s.heapF[c] = pf;
      s.heapO[c] = s.heapO[p]!;
      c = p;
    }
    s.heapN[c] = k;
    s.heapF[c] = f;
    s.heapO[c] = o;
  };
  const pop = (): number => {
    const top = s.heapN[0]!;
    heapSize--;
    if (heapSize > 0) {
      const k = s.heapN[heapSize]!;
      const f = s.heapF[heapSize]!;
      const o = s.heapO[heapSize]!;
      let c = 0;
      for (;;) {
        const l = c * 2 + 1;
        if (l >= heapSize) break;
        let m = l;
        const r = l + 1;
        if (r < heapSize && (s.heapF[r]! < s.heapF[l]! || (s.heapF[r] === s.heapF[l] && s.heapO[r]! < s.heapO[l]!))) m = r;
        if (s.heapF[m]! > f || (s.heapF[m] === f && s.heapO[m]! > o)) break;
        s.heapN[c] = s.heapN[m]!;
        s.heapF[c] = s.heapF[m]!;
        s.heapO[c] = s.heapO[m]!;
        c = m;
      }
      s.heapN[c] = k;
      s.heapF[c] = f;
      s.heapO[c] = o;
    }
    return top;
  };

  s.stamp[startK] = gen;
  s.g[startK] = 0;
  s.came[startK] = -1;
  push(startK, heur(startK));
  let best = startK;
  let bestH = heur(startK);
  let expanded = 0;
  let found = false;

  while (heapSize > 0) {
    const k = pop();
    if (s.closed[k] === gen) continue;
    s.closed[k] = gen;
    if (k === goalK) {
      found = true;
      break;
    }
    const hk = heur(k);
    if (hk < bestH) {
      bestH = hk;
      best = k;
    }
    if (++expanded > maxExpand) break;
    const i = k % w;
    const j = (k - i) / w;
    const gk = s.g[k]!;
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        if (di === 0 && dj === 0) continue;
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= w || nj >= h) continue;
        const nk = nj * w + ni;
        if (!(map.pass[nk]! & mask) || s.closed[nk] === gen) continue;
        if (di !== 0 && dj !== 0) {
          // No cutting corners past blocked tiles.
          if (!(map.pass[j * w + ni]! & mask) || !(map.pass[nj * w + i]! & mask)) continue;
        }
        const info = TERRAIN[map.ter[nk]!]!;
        const step = ((di !== 0 && dj !== 0 ? SQRT2 : 1) * TILE) / (info.speed[ci]! * (info.wet ? WET_PENALTY : 1));
        const ng = gk + step;
        if (s.stamp[nk] !== gen || ng < s.g[nk]!) {
          s.stamp[nk] = gen;
          s.g[nk] = ng;
          s.came[nk] = k;
          push(nk, ng + heur(nk));
        }
      }
    }
  }

  const end = found ? goalK : best;
  if (!found) {
    goalX = ((end % w) + 0.5) * TILE;
    goalY = (Math.floor(end / w) + 0.5) * TILE;
  }
  // Walk back to the start.
  const tiles: number[] = [];
  for (let k = end; k !== -1 && k !== startK; k = s.came[k]!) tiles.push(k);
  tiles.reverse();
  if (!tiles.length) return [goalX, goalY];
  const pts: number[] = [];
  for (let n = 0; n < tiles.length - 1; n++) {
    const k = tiles[n]!;
    pts.push(((k % w) + 0.5) * TILE, (Math.floor(k / w) + 0.5) * TILE);
  }
  pts.push(goalX, goalY);
  return smoothPath(map, sx, sy, pts, mask);
}

/** Waypoints looked ahead when string-pulling (bounds the work on long paths). */
const LOOKAHEAD = 48;

/**
 * String-pulling: skip waypoints while the straight line costs no more than the A* path it
 * replaces, and never wades where that stretch of the path stayed dry: shortcuts don't cut
 * through water or bog the path went round (a ford stays a ford).
 */
function smoothPath(map: BattleMap, sx: number, sy: number, pts: number[], mask: number): number[] {
  const ci = classIndex(mask);
  const n = pts.length / 2;
  // Cost of the raw path from the start up to each waypoint (index 0 is the start).
  const cum = [0];
  // How many waypoints up to each one are in water or bog.
  const wet = [0];
  let px = sx;
  let py = sy;
  for (let i = 0; i < n; i++) {
    const x = pts[i * 2]!;
    const y = pts[i * 2 + 1]!;
    cum.push(cum[i]! + lineCost(map, px, py, x, y, mask, ci));
    wet.push(wet[i]! + (TERRAIN[terrainAt(map, x, y)]!.wet ? 1 : 0));
    px = x;
    py = y;
  }
  const out: number[] = [];
  let cur = 0;
  let cx = sx;
  let cy = sy;
  while (cur < n) {
    let far = cur + 1;
    for (let m = Math.min(n, cur + LOOKAHEAD); m > cur + 1; m--) {
      const c = lineCost(map, cx, cy, pts[(m - 1) * 2]!, pts[(m - 1) * 2 + 1]!, mask, ci, wet[m] === wet[cur]);
      if (c <= cum[m]! - cum[cur]! + 1e-6) {
        far = m;
        break;
      }
    }
    cx = pts[(far - 1) * 2]!;
    cy = pts[(far - 1) * 2 + 1]!;
    out.push(cx, cy);
    cur = far;
  }
  return out;
}
