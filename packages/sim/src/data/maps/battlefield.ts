import { T } from '../../map/terrain';
import type { MapScript, Painter } from '../../map/mapgen';
import { lerp, smooth } from '../../math/det';

// The campaigns' battlefield: one map drawn from a handful of numbers, so each historical
// battle gets its own ground. A river between the armies (the Granicus), a lake beside the
// road (Trasimene), the sea on a flank (Issus), a ridge in the fog (Cynoscephalae), the
// lines of Alesia, a mountain pass (the Persian Gate)...
//
// Params (all optional):
//   g       ground: 0 meadow, 1 dry Mediterranean scrub, 2 desert, 3 steppe, 4 farmland
//   river   1 across the field between the armies (west to east), 2 along it (north to south)
//   at      where the river runs, 0..1 across the map (default: the middle, or the east flank)
//   deep    1: a deep river crossed only at fords and the bridge (otherwise wide shallows)
//   fords   fords on a deep river (default 2);  bridge 1: a bridge in the middle
//   lake    a lake on one side: 1 west, 2 east, 3 south, 4 north
//   coast   the sea along one side: 1 west, 2 east, 3 south, 4 north
//   hills   how many hills (0..6), with hillH their height in metres (default 7)
//   ridge   1 a ridge across the middle, 2 high ground in the north, 3 in the south
//   forest  0..3 how wooded;  wood 1/2: a forested west/east flank
//   marsh   0..2 how marshy;  ravine 1: a brushy gully on the west flank (an ambush)
//   walls   1: two lines of fortifications across the field, with gates (Alesia)
//   pass    corridor width in metres between cliffs (a mountain pass); passWall 1: a wall across it
//   road    0: no road through the middle
//
// Zones: south and north (where the armies usually start, each with _w and _e halves), west
// and east (the flanks), centre (and centre_n / centre_s, facing north and south), hold_n
// and hold_s (either side of the middle, facing it), ravine (with ravine), between and
// between_s (with walls).

const W = 460;
const H = 340;
const BAND = 84;

const WEST = 1;
const EAST = 2;
const SOUTH = 3;
const NORTH = 4;

const GROUND_FOREST = [1, 1, 0, 0, 1];

function build(p: Painter, params: Record<string, number>): void {
  const P = (k: string, d: number): number => params[k] ?? d;
  const g = P('g', 0);
  const lake = P('lake', 0);
  const coast = P('coast', 0);
  const pass = P('pass', 0);
  const wet = (t: number): boolean => t === T.water || t === T.shallow || t === T.marsh;

  // --- Where the armies stand: kept clear of water and woods --------------------------
  let xl = 24;
  let xr = W - 24;
  let ys1 = H - 12;
  let yn0 = 12;
  if (lake === WEST || coast === WEST) xl = W * (lake === WEST ? 0.34 : 0.28) + 12;
  if (lake === EAST || coast === EAST) xr = W * (lake === EAST ? 0.66 : 0.72) - 12;
  if (lake === SOUTH || coast === SOUTH) ys1 = H * (lake === SOUTH ? 0.66 : 0.72) - 10;
  if (lake === NORTH || coast === NORTH) yn0 = H * (lake === NORTH ? 0.34 : 0.28) + 10;
  if (pass > 0) {
    xl = W / 2 - pass / 2 + 8;
    xr = W / 2 + pass / 2 - 8;
  }
  const ys0 = ys1 - BAND;
  const yn1 = yn0 + BAND;
  const inBand = (x: number, y: number): boolean => x > xl - 8 && x < xr + 8 && ((y > ys0 - 6 && y < ys1 + 6) || (y > yn0 - 6 && y < yn1 + 6));

  // --- Ground ----------------------------------------------------------------------------
  if (g === 1) {
    p.fill(T.dry);
    p.roll(2, 90);
    p.noiseFill(T.grass, 50, 0.62, 1);
    p.noiseFill(T.rough, 26, 0.72, 2, (_c, x, y) => !inBand(x, y));
    p.noiseFill(T.dirt, 70, 0.7, 3);
  } else if (g === 2) {
    p.fill(T.sand);
    p.roll(1.2, 70);
    p.noiseFill(T.dirt, 70, 0.55, 1);
    p.noiseFill(T.rough, 24, 0.78, 2, (_c, x, y) => !inBand(x, y));
  } else if (g === 3) {
    p.fill(T.dry);
    p.roll(0.9, 120);
    p.noiseFill(T.grass, 80, 0.58, 1);
    p.noiseFill(T.dirt, 60, 0.75, 2);
  } else if (g === 4) {
    p.fill(T.grass);
    p.roll(1.2, 100);
    p.noiseFill(T.field, 40, 0.5, 1);
    p.noiseFill(T.dry, 60, 0.66, 2);
  } else {
    p.fill(T.grass);
    p.roll(1.6, 100);
    p.noiseFill(T.dry, 60, 0.62, 1);
    p.noiseFill(T.field, 45, 0.74, 2);
  }

  // --- Relief ------------------------------------------------------------------------------
  const hillH = P('hillH', 7);
  let hillX = W / 2;
  let hillY = H / 2;
  for (let k = 0; k < P('hills', 0); k++) {
    const x = lerp(xl + 30, xr - 30, p.rand());
    const y = lerp(110, H - 110, p.rand());
    if (k === 0) {
      hillX = x;
      hillY = y;
    }
    p.hill(x, y, 40 + p.rand() * 30, hillH * (0.6 + 0.4 * p.rand()));
  }
  const ridge = P('ridge', 0);
  if (ridge === 1) {
    p.raise((x, y) => {
      const d = Math.abs(y - H / 2 + (p.noise(x, 0, 80, 31) - 0.5) * 40);
      return hillH * 1.3 * (1 - smooth(0, 75, d));
    });
    p.noiseFill(T.rough, 18, 0.7, 32, (cur, x, y) => !wet(cur) && Math.abs(y - H / 2) < 24 && x > 30 && x < W - 30);
    hillY = H / 2;
  } else if (ridge === 2 || ridge === 3) {
    p.raise((_x, y) => hillH * (ridge === 2 ? 1 - smooth(H * 0.22, H * 0.62, y) : smooth(H * 0.38, H * 0.78, y)));
    hillY = ridge === 2 ? H * 0.2 : H * 0.8;
  }

  // --- Water -------------------------------------------------------------------------------
  /** Distance inward from a map side (west/east/south/north), wobbling. */
  const fromSide = (side: number, x: number, y: number): number => (side === WEST ? x : side === EAST ? W - x : side === SOUTH ? H - y : y);
  if (coast) {
    // The sea along one side: a wobbling shoreline about a quarter of the way in.
    const reach = coast === WEST || coast === EAST ? W * 0.24 : H * 0.24;
    p.eachTile(0, 0, W, H, (i, j, x, y) => {
      const along = coast === WEST || coast === EAST ? y : x;
      const d = fromSide(coast, x, y) - reach - (p.noise(along, 0, 60, 41) - 0.5) * 28;
      if (d < -9) p.set(i, j, T.water);
      else if (d < -3) p.set(i, j, T.shallow);
      else if (d < 5) p.set(i, j, T.sand);
    });
  }
  if (lake) {
    // A lake filling most of one side, with a ragged shore.
    const horiz = lake === WEST || lake === EAST;
    const cx = lake === WEST ? -W * 0.06 : lake === EAST ? W * 1.06 : W / 2;
    const cy = lake === NORTH ? -H * 0.08 : lake === SOUTH ? H * 1.08 : H / 2;
    const rx = horiz ? W * 0.4 : W * 0.62;
    const ry = horiz ? H * 0.62 : H * 0.42;
    p.eachTile(0, 0, W, H, (i, j, x, y) => {
      const q = ((x - cx) / rx) * ((x - cx) / rx) + ((y - cy) / ry) * ((y - cy) / ry) + (p.noise(x, y, 40, 43) - 0.5) * 0.18;
      if (q < 0.86) p.set(i, j, T.water);
      else if (q < 0.94) p.set(i, j, T.shallow);
      else if (q < 1.0) p.set(i, j, T.sand);
    });
  }
  const river = P('river', 0);
  let bridgeAt: [number, number] | null = null;
  const fordsAt: [number, number][] = [];
  if (river) {
    const across = river === 1;
    const at = P('at', across ? 0.5 : 0.84) * (across ? H : W);
    const deep = P('deep', 0) === 1;
    // Centre line of the river: y at x (across) or x at y (along).
    const line = (s: number): number => at + (p.noise(s, 0, 90, 21) - 0.5) * 46;
    p.eachTile(0, 0, W, H, (i, j, x, y) => {
      const d = Math.abs((across ? y : x) - line(across ? x : y)) + (p.noise(x, y, 12, 7) - 0.5) * 3;
      if (deep && d < 7) p.set(i, j, T.water);
      else if (d < (deep ? 11 : 10)) p.set(i, j, T.shallow);
      else if (d < (deep ? 13.5 : 12.5) && !wet(p.get(i, j))) p.set(i, j, T.sand);
    });
    const span = across ? W : H;
    if (deep) {
      const n = P('fords', 2);
      for (let k = 0; k < n; k++) {
        const s = (span * (k + 1)) / (n + 1) + (n === 2 ? (k === 0 ? -span * 0.12 : span * 0.12) : 0);
        const fx = across ? s : line(s);
        const fy = across ? line(s) : s;
        fordsAt.push([fx, fy]);
        p.eachTile(fx - (across ? 16 : 20), fy - (across ? 20 : 16), fx + (across ? 16 : 20), fy + (across ? 20 : 16), (i, j) => {
          if (p.get(i, j) === T.water) p.set(i, j, T.shallow);
        });
      }
    }
    if (P('bridge', 0)) {
      const bx = across ? W / 2 : line(H / 2);
      const by = across ? line(W / 2) : H / 2;
      bridgeAt = [bx, by];
      if (across) p.rect(bx - 3, by - 15, bx + 3, by + 15, T.bridge);
      else p.rect(bx - 15, by - 3, bx + 15, by + 3, T.bridge);
    }
  }

  // --- Woods, marsh and the ravine ---------------------------------------------------------
  const forest = P('forest', GROUND_FOREST[g] ?? 0);
  if (forest > 0) {
    const thr = [1, 0.72, 0.64, 0.57][Math.min(3, forest)]!;
    p.noiseFill(T.forest, 36, thr, 3, (cur, x, y) => !wet(cur) && cur !== T.bridge && !inBand(x, y));
  }
  const wood = P('wood', 0);
  if (wood) {
    p.eachTile(0, 0, W, H, (i, j, x, y) => {
      const d = wood === WEST ? x : W - x;
      if (d < 90 + (p.noise(x, y, 30, 51) - 0.5) * 40 && y > 70 && y < H - 70 && !wet(p.get(i, j))) p.set(i, j, T.forest);
    });
  }
  const marsh = P('marsh', 0);
  if (marsh > 0) {
    const thr = [1, 0.72, 0.64][Math.min(2, marsh)]!;
    p.noiseFill(T.marsh, 22, thr, 6, (cur, x, y) => (cur === T.grass || cur === T.dry || cur === T.sand) && !inBand(x, y));
  }
  const ravine = P('ravine', 0) === 1;
  const gullyX = (y: number): number => W * 0.2 + (p.noise(0, y, 60, 61) - 0.5) * 30;
  if (ravine) {
    const pts: number[] = [];
    for (let y = H * 0.18; y <= H * 0.82; y += 20) pts.push(gullyX(y), y);
    p.stroke(pts, 30, T.forest, 4, [T.grass, T.dry, T.field, T.rough, T.dirt, T.sand]);
    p.stroke(pts, 4, T.shallow, 1);
    p.raise((x, y) => (y > H * 0.15 && y < H * 0.85 ? -2.2 * (1 - smooth(0, 22, Math.abs(x - gullyX(y)))) : 0));
  }

  // --- Fortifications and passes ---------------------------------------------------------
  const walls = P('walls', 0) === 1;
  const wallY = [H * 0.36, H * 0.64];
  const gates = [W * 0.18, W * 0.5, W * 0.82];
  if (walls) {
    for (const y of wallY) {
      p.rect(0, y - 1.5, W, y + 1.5, T.wall);
      for (const gx of gates) p.rect(gx - 6, y - 2, gx + 6, y + 2, T.dirt);
    }
  }
  if (pass > 0) {
    const half = (y: number): number => (pass / 2) * (1 - 0.35 * (1 - smooth(0, H * 0.3, Math.abs(y - H / 2))));
    p.eachTile(0, 0, W, H, (i, j, x, y) => {
      const d = Math.abs(x - W / 2 + (p.noise(0, y, 50, 71) - 0.5) * 18) - half(y);
      if (d > 0) p.set(i, j, T.cliff);
      else if (d > -5) p.set(i, j, T.rough);
    });
    if (P('passWall', 0)) {
      const y = H / 2;
      p.eachTile(0, y - 1.5, W, y + 1.5, (i, j, x) => {
        if (p.get(i, j) !== T.cliff && Math.abs(x - W / 2) > 4) p.set(i, j, T.wall);
      });
    }
  }

  // --- The road ----------------------------------------------------------------------------
  if (P('road', 1) && !pass) {
    const pts: number[] = [];
    for (let y = 0; y <= H; y += 34) pts.push(W / 2 + (p.noise(0, y, 70, 81) - 0.5) * 50, y);
    p.stroke(pts, 4, T.road, 0, [T.grass, T.dry, T.field, T.forest, T.rough, T.dirt, T.sand]);
  }

  // --- Heights, water beds, walls ----------------------------------------------------------
  p.sink(T.water, -2.2);
  p.sink(T.shallow, -0.5);
  if (pass > 0) {
    p.lift(T.cliff, (x) => 7 + Math.min(11, Math.max(0, Math.abs(x - W / 2) - pass / 2) * 0.35));
  }
  p.lift(T.wall, 2.6);
  p.sea = coast || lake || river ? -0.3 : -6;

  // --- Props -------------------------------------------------------------------------------
  p.scatter('tree', g === 2 ? 0.25 : 0.5, [T.forest]);
  p.scatter('rock', 0.18, [T.rough]);
  p.scatter('reeds', 0.28, [T.shallow, T.marsh]);
  p.scatter('bush', g === 2 ? 0.005 : 0.012, [T.grass, T.dry, T.sand]);
  if (pass > 0) p.scatter('tree', 0.04, [T.cliff], 0.9, 1.3);
  for (let k = 0; k < 4; k++) {
    p.prop('tent', W / 2 - 60 + k * 40, ys1 + 6, 1);
    p.prop('tent', W / 2 - 60 + k * 40, yn0 - 6, 1);
  }

  // --- Zones and points --------------------------------------------------------------------
  const mid = (xl + xr) / 2;
  p.zone('south', xl, ys0, xr, ys1, 0, -1);
  p.zone('south_w', xl, ys0, mid - 6, ys1, 0, -1);
  p.zone('south_e', mid + 6, ys0, xr, ys1, 0, -1);
  p.zone('north', xl, yn0, xr, yn1, 0, 1);
  p.zone('north_w', xl, yn0, mid - 6, yn1, 0, 1);
  p.zone('north_e', mid + 6, yn0, xr, yn1, 0, 1);
  p.zone('west', Math.max(10, xl - 14), H * 0.3, Math.max(10, xl - 14) + 70, H * 0.7, 1, 0);
  p.zone('east', Math.min(W - 10, xr + 14) - 70, H * 0.3, Math.min(W - 10, xr + 14), H * 0.7, -1, 0);
  p.zone('centre', W / 2 - 70, H / 2 - 36, W / 2 + 70, H / 2 + 36, 0, -1);
  // The middle of the field, facing each way (an army caught between two others).
  p.zone('centre_n', W / 2 - 90, H / 2 - 44, W / 2 + 90, H / 2 - 4, 0, -1);
  p.zone('centre_s', W / 2 - 90, H / 2 + 4, W / 2 + 90, H / 2 + 44, 0, 1);
  // Holding a line across the middle (a wall, a pass): just north of it facing south, or
  // just south of it facing north.
  p.zone('hold_n', xl, H / 2 - 48, xr, H / 2 - 6, 0, 1);
  p.zone('hold_s', xl, H / 2 + 6, xr, H / 2 + 48, 0, -1);
  if (ravine) p.zone('ravine', Math.max(8, gullyX(H / 2) - 56), H * 0.36, gullyX(H / 2) - 10, H * 0.64, 1, 0);
  if (walls) {
    p.zone('between', xl, wallY[0]! + 8, xr, H / 2 - 4, 0, -1);
    p.zone('between_s', xl, H / 2 + 4, xr, wallY[1]! - 8, 0, 1);
    gates.forEach((gx, k) => p.point(`gate${k + 1}`, gx, wallY[1]!));
  }
  p.point('centre', W / 2, H / 2);
  p.point('hill', hillX, hillY);
  if (bridgeAt) p.point('bridge', bridgeAt[0], bridgeAt[1]);
  fordsAt.forEach(([fx, fy], k) => p.point(`ford${k + 1}`, fx, fy));
}

export const BATTLEFIELD: MapScript = { id: 'battlefield', name: 'Battlefield', theme: 'meadow', w: W, h: H, build };
