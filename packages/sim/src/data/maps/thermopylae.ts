import { T } from '../../map/terrain';
import type { MapScript, Painter } from '../../map/mapgen';
import { clamp, lerp, smooth } from '../../math/det';

// Thermopylae, 480 BC: a coastal road squeezed between the cliffs of Mount Kallidromos and
// the Malian Gulf. The Persians come from the west; at the Middle Gate the pass is barely
// twenty metres wide, closed by the old Phocian wall. A goat path (the Anopaea) climbs
// through the mountains and comes down behind the Greeks.

const W = 560;
const H = 340;

/** Centre line of the pass (y) at x. */
export function passY(x: number): number {
  return 172 + 14 * (smooth(0, W, x) - 0.5);
}

/** Half-width of the pass at x: wide plain in the west, the Middle Gate at x≈300-330. */
export function passHalf(x: number): number {
  if (x < 130) return 68;
  if (x < 296) return lerp(68, 9, smooth(130, 296, x));
  if (x < 336) return 9;
  if (x < 440) return lerp(9, 40, smooth(336, 440, x));
  return 40;
}

/** The Anopaea path through the mountains, west to east. */
export const ANOPAEA = [64, 238, 110, 288, 200, 316, 300, 318, 392, 300, 452, 270, 478, 246, 488, 216];

function build(p: Painter): void {
  p.fill(T.grass);
  const sea = (x: number): number => passY(x) - passHalf(x);
  const cliff = (x: number): number => passY(x) + passHalf(x);
  for (let j = 0; j < p.h; j++) {
    for (let i = 0; i < p.w; i++) {
      const x = p.cx(i);
      const y = p.cy(j);
      const wob = (p.noise(x, y, 14, 4) - 0.5) * 6;
      const shore = sea(x) + wob;
      const foot = cliff(x) + wob * 0.6;
      if (y < shore - 9) p.set(i, j, T.water);
      else if (y < shore - 3) p.set(i, j, T.shallow);
      else if (y < shore + 4) p.set(i, j, T.sand);
      else if (y > foot) p.set(i, j, T.cliff);
      else if (y > foot - 5) p.set(i, j, T.rough);
    }
  }
  // Marshes by the shore on the Persian side, hot springs near the gate.
  p.noiseFill(T.marsh, 22, 0.62, 2, (cur, x, y) => cur === T.grass && x < 260 && y < passY(x) - passHalf(x) * 0.35);
  p.circle(318, passY(318) - 4, 3.5, T.marsh, 1.5);
  p.noiseFill(T.dry, 40, 0.58, 3, (cur) => cur === T.grass);
  // The road along the pass.
  const road: number[] = [];
  for (let x = 0; x <= W; x += 20) road.push(x, passY(x) + passHalf(x) * 0.35);
  p.stroke(road, 4, T.road, 0, [T.grass, T.dry, T.marsh]);
  // The Anopaea path cuts through the cliffs.
  p.stroke(ANOPAEA, 7, T.rough, 1.2);
  p.stroke(ANOPAEA, 3.5, T.dirt, 0.6, [T.rough]);

  // The Phocian wall across the Middle Gate, with a narrow gateway.
  const wx = 322;
  const top = sea(wx) - 1;
  const bottom = cliff(wx) + 2;
  const mid = passY(wx);
  p.rect(wx - 1.5, top, wx + 1.5, mid - 3.5, T.wall);
  p.rect(wx - 1.5, mid + 3.5, wx + 1.5, bottom, T.wall);

  // Heights: the sea floor, the coastal flat, the mountain wall, the path's climb.
  p.raise((x, y) => {
    const foot = cliff(x);
    if (y > foot - 1) return 6 + Math.min(16, (y - foot) * 0.45);
    return (p.noise(x, y, 60, 9) - 0.5) * 1.2;
  });
  // The path climbs to about 13 m in the middle and comes down at both ends.
  const pathHeight = (t: number): number => 13 * Math.min(1, t / 0.25, (1 - t) / 0.25);
  const segs = ANOPAEA.length / 2 - 1;
  p.raise((x, y) => {
    const ter = p.terrainAt(x, y);
    if (ter !== T.rough && ter !== T.dirt) return 0;
    // Distance along the path (0..1) of the closest segment point.
    let best = 1e9;
    let at = 0;
    for (let k = 0; k < segs; k++) {
      const ax = ANOPAEA[k * 2]!;
      const ay = ANOPAEA[k * 2 + 1]!;
      const bx = ANOPAEA[k * 2 + 2]!;
      const by = ANOPAEA[k * 2 + 3]!;
      const vx = bx - ax;
      const vy = by - ay;
      const l2 = vx * vx + vy * vy;
      const u = clamp(((x - ax) * vx + (y - ay) * vy) / l2, 0, 1);
      const dx = x - (ax + vx * u);
      const dy = y - (ay + vy * u);
      const d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
        at = (k + u) / segs;
      }
    }
    if (best > 8 * 8) return 0;
    // Flatten toward the path's own height (the mountain raise put it high).
    const foot = cliff(x);
    const mountain = y > foot - 1 ? 6 + Math.min(16, (y - foot) * 0.45) : 0;
    return pathHeight(at) - mountain;
  });
  p.sink(T.water, -2.6);
  p.sink(T.shallow, -0.6);
  p.lift(T.wall, 2.6);
  p.sea = -0.3;

  // Props: pines and olives on the slopes, rocks at the cliff foot, reeds in the marsh,
  // the Persian camp in the west and the Greek camp in the east.
  p.scatter('tree', 0.05, [T.cliff], 0.9, 1.3);
  p.scatter('rock', 0.12, [T.rough]);
  p.scatter('reeds', 0.3, [T.marsh, T.shallow]);
  p.scatter('bush', 0.01, [T.grass, T.dry]);
  for (let k = 0; k < 9; k++) p.prop('tent', 12 + (k % 3) * 14, passY(20) - 30 + Math.floor(k / 3) * 26, 1.1);
  for (let k = 0; k < 4; k++) p.prop('tent', 530 + (k % 2) * 14, passY(530) - 18 + Math.floor(k / 2) * 30, 1);
  p.prop('banner', 360, passY(360) - 4, 1.2);
  p.prop('column', 318, passY(318) - 6, 0.8);

  // Zones: deployment, the breakthrough line, the Phocians on the path.
  p.zone('greeks_front', 334, passY(370) - 16, 404, passY(370) + 16, -1, 0);
  p.zone('greeks_rear', 404, passY(440) - 30, 470, passY(440) + 30, -1, 0);
  p.zone('phocians', 432, 262, 462, 282, -1, 0.5);
  p.zone('persians', 14, passY(60) - 52, 124, passY(60) + 52, 1, 0);
  p.zone('immortals_start', 30, 226, 96, 262, 1, 0.6);
  p.zone('east_exit', 512, passY(530) - 44, W, passY(530) + 44, 1, 0);
  p.route('anopaea', ANOPAEA);
  p.point('gate', 322, passY(322));
}

export const THERMOPYLAE: MapScript = {
  id: 'thermopylae',
  name: 'The Hot Gates',
  theme: 'coast',
  w: W,
  h: H,
  build,
};
