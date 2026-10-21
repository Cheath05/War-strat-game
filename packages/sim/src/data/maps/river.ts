import { T } from '../../map/terrain';
import type { MapScript, Painter } from '../../map/mapgen';
import { smooth } from '../../math/det';

// A river crossing: deep water down the middle of the map, a stone bridge on the road and
// two fords up- and downstream. The east bank has farms and a village to defend.

const W = 440;
const H = 320;
const BRIDGE = 160;
const FORD_N = 62;
const FORD_S = 262;

/** Centre line of the river (x) at y. */
export function riverX(y: number): number {
  return 206 + 22 * (smooth(0, BRIDGE, y) - smooth(BRIDGE, H, y));
}

function build(p: Painter): void {
  p.fill(T.grass);
  p.roll(1.4, 100);
  p.noiseFill(T.dry, 60, 0.6, 1);
  p.noiseFill(T.forest, 36, 0.68, 3, (_c, x) => x < 150 || x > 390);
  p.noiseFill(T.field, 40, 0.62, 2, (cur, x) => cur === T.grass && x > 300 && x < 400);
  p.noiseFill(T.marsh, 18, 0.72, 6, (cur, x, y) => cur !== T.forest && Math.abs(x - riverX(y)) < 30);
  // The river: deep in the middle, shallows and sand along the banks.
  p.eachTile(0, 0, W, H, (i, j, x, y) => {
    const d = Math.abs(x - riverX(y)) + (p.noise(x, y, 12, 7) - 0.5) * 3;
    if (d < 8) p.set(i, j, T.water);
    else if (d < 12) p.set(i, j, T.shallow);
    else if (d < 14.5 && p.get(i, j) !== T.forest) p.set(i, j, T.sand);
  });
  // Two fords where the river runs wide and shallow.
  for (const fy of [FORD_N, FORD_S]) {
    const fx = riverX(fy);
    p.eachTile(fx - 18, fy - 8, fx + 18, fy + 8, (i, j) => {
      if (p.get(i, j) === T.water) p.set(i, j, T.shallow);
    });
  }
  // The road and its bridge.
  const bx = riverX(BRIDGE);
  const on = [T.grass, T.dry, T.field, T.forest, T.marsh, T.sand];
  p.stroke([0, 172, 110, 168, bx - 16, BRIDGE], 4, T.road, 0, on);
  p.stroke([bx + 16, BRIDGE, 330, 154, W, 148], 4, T.road, 0, on);
  p.rect(bx - 15, BRIDGE - 4, bx + 15, BRIDGE + 4, T.bridge);
  p.sink(T.water, -2.2);
  p.sink(T.shallow, -0.5);
  p.sea = -0.3;

  p.scatter('tree', 0.5, [T.forest]);
  p.scatter('reeds', 0.3, [T.shallow, T.marsh]);
  p.scatter('bush', 0.012, [T.grass, T.dry]);
  for (let k = 0; k < 6; k++) p.prop('tent', 352 + (k % 3) * 16, 120 + Math.floor(k / 3) * 60, 1);
  p.prop('banner', 300, BRIDGE - 10, 1.2);
  p.prop('column', bx + 18, BRIDGE + 6, 0.7);

  p.zone('west', 20, 40, 130, H - 40, 1, 0);
  p.zone('west_edge', 6, 40, 44, H - 40, 1, 0);
  p.zone('east', 250, 40, 330, H - 40, -1, 0);
  p.zone('east_bank', 340, 0, W, H, -1, 0);
  p.point('cp1', bx, BRIDGE);
  p.point('cp2', riverX(FORD_N), FORD_N);
  p.point('cp3', riverX(FORD_S), FORD_S);
  p.route('ford_n', [90, 90, riverX(FORD_N) - 24, FORD_N, riverX(FORD_N) + 26, FORD_N, 300, 96]);
  p.route('ford_s', [90, 236, riverX(FORD_S) - 24, FORD_S, riverX(FORD_S) + 26, FORD_S, 300, 230]);
}

export const RIVER: MapScript = { id: 'river', name: 'The River Crossing', theme: 'meadow', w: W, h: H, build };
