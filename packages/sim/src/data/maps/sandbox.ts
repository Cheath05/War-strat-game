import { T } from '../../map/terrain';
import type { Painter, MapScript } from '../../map/mapgen';

// Open battlefields for the sandbox. Hills, woods and oases move with the map's seed, so every
// battle on them is laid out a little differently. Each has a deep zone at either end.

const W = 420;
const H = 300;

function ends(p: Painter): void {
  p.zone('south', 30, p.hm - 95, p.wm - 30, p.hm - 12, 0, -1);
  p.zone('north', 30, 12, p.wm - 30, 95, 0, 1);
}

/** A random point away from the map's ends (where the armies deploy). */
function middle(p: Painter, margin = 40): [number, number] {
  return [margin + p.rand() * (p.wm - margin * 2), 100 + p.rand() * (p.hm - 200)];
}

/** Rolling green hills with wooded flanks and rocky crowns. */
export const HILLS: MapScript = {
  id: 'hills',
  name: 'Rolling Hills',
  theme: 'meadow',
  w: W,
  h: H,
  build(p) {
    p.fill(T.grass);
    p.roll(2.4, 90);
    for (let i = 0; i < 5; i++) {
      const [x, y] = middle(p, 50);
      p.hill(x, y, 40 + p.rand() * 40, 6 + p.rand() * 8);
    }
    p.noiseFill(T.dry, 60, 0.62, 1);
    p.noiseFill(T.forest, 34, 0.74, 2, (_c, _x, y) => y > 95 && y < p.hm - 95);
    p.noiseFill(T.rough, 22, 0.78, 3);
    p.stroke([0, p.hm * 0.55, p.wm * 0.35, p.hm * 0.45, p.wm * 0.7, p.hm * 0.6, p.wm, p.hm * 0.5], 5, T.road, 0, [T.grass, T.dry, T.rough]);
    p.scatter('tree', 0.55, [T.forest]);
    p.scatter('bush', 0.015, [T.grass, T.dry]);
    p.scatter('rock', 0.25, [T.rough]);
    ends(p);
    p.sea = -5;
  },
};

/** A great wood: armies meet in clearings and along the forest road. */
export const WOODS: MapScript = {
  id: 'woods',
  name: 'Woodland',
  theme: 'meadow',
  w: W,
  h: H,
  build(p) {
    p.fill(T.grass);
    p.roll(1.4, 100);
    p.noiseFill(T.forest, 42, 0.42, 1, (_c, _x, y) => y > 70 && y < p.hm - 70);
    for (let i = 0; i < 4; i++) {
      const [x, y] = middle(p);
      p.circle(x, y, 22 + p.rand() * 22, T.grass, 6);
    }
    const stream = [p.wm * 0.15, 0, p.wm * 0.25, p.hm * 0.4, p.wm * 0.18, p.hm * 0.7, p.wm * 0.28, p.hm];
    p.stroke(stream, 6, T.shallow, 1.2);
    p.stroke(stream, 2.5, T.water, 0.5);
    p.sink(T.shallow, -0.4);
    p.sink(T.water, -1.4);
    p.noiseFill(T.marsh, 20, 0.8, 4, (cur) => cur === T.grass);
    p.stroke([p.wm * 0.55, 0, p.wm * 0.5, p.hm * 0.5, p.wm * 0.6, p.hm], 6, T.road, 0, [T.grass, T.forest, T.marsh]);
    p.scatter('tree', 0.7, [T.forest]);
    p.scatter('bush', 0.03, [T.grass]);
    p.scatter('reeds', 0.3, [T.shallow, T.marsh]);
    ends(p);
    p.sea = -0.25;
  },
};

/** Sand and dunes, rocky outcrops and an oasis of palms. */
export const DESERT: MapScript = {
  id: 'desert',
  name: 'Desert',
  theme: 'desert',
  w: W,
  h: H,
  build(p) {
    p.fill(T.sand);
    p.roll(2.8, 60);
    p.noiseFill(T.dirt, 70, 0.6, 1);
    p.noiseFill(T.rough, 26, 0.72, 2);
    for (let i = 0; i < 3; i++) {
      const [x, y] = middle(p, 50);
      p.hill(x, y, 30 + p.rand() * 30, 4 + p.rand() * 6);
    }
    // The oasis: a pool ringed with grass and palms.
    const [ox, oy] = middle(p, 90);
    p.circle(ox, oy, 26, T.grass, 5);
    p.circle(ox, oy, 12, T.shallow, 3);
    p.circle(ox, oy, 7, T.water, 2);
    p.sink(T.shallow, -0.4);
    p.sink(T.water, -1.4);
    p.stroke([0, p.hm * 0.5, p.wm * 0.5, p.hm * 0.45, p.wm, p.hm * 0.52], 5, T.road, 0, [T.sand, T.dirt]);
    p.scatter('tree', 0.35, [T.grass]);
    p.scatter('rock', 0.3, [T.rough]);
    p.scatter('bush', 0.006, [T.sand, T.dirt]);
    p.scatter('reeds', 0.3, [T.shallow]);
    ends(p);
    p.sea = -0.25;
  },
};
