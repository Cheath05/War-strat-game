import { T } from '../../map/terrain';
import type { MapScript } from '../../map/mapgen';

/** Open farmland with a low hill, scattered woods and a stream with fords. */
export const PLAINS: MapScript = {
  id: 'plains',
  name: 'Open Plains',
  theme: 'meadow',
  w: 420,
  h: 300,
  build(p) {
    p.fill(T.grass);
    p.roll(1.8, 110);
    p.hill(p.wm * 0.3, p.hm * 0.52, 70, 7);
    p.hill(p.wm * 0.78, p.hm * 0.42, 50, 4);
    p.noiseFill(T.dry, 70, 0.6, 1);
    p.noiseFill(T.field, 45, 0.74, 2, (cur, x, y) => cur !== T.forest && (y < 80 || y > p.hm - 80));
    p.noiseFill(T.forest, 38, 0.72, 3, (_c, x, y) => y > 70 && y < p.hm - 70 && (x < 120 || x > p.wm - 120));
    p.noiseFill(T.rough, 25, 0.8, 4);
    // A stream across the east side with two fords.
    const stream = [p.wm * 0.66, 0, p.wm * 0.7, p.hm * 0.3, p.wm * 0.64, p.hm * 0.6, p.wm * 0.72, p.hm];
    p.stroke(stream, 9, T.shallow, 1.5);
    p.stroke(stream, 4, T.water, 0.8);
    p.circle(p.wm * 0.69, p.hm * 0.28, 7, T.shallow);
    p.circle(p.wm * 0.66, p.hm * 0.66, 7, T.shallow);
    p.sink(T.shallow, -0.4);
    p.sink(T.water, -1.6);
    p.stroke([p.wm * 0.45, 0, p.wm * 0.42, p.hm * 0.5, p.wm * 0.48, p.hm], 5, T.road, 0, [T.grass, T.dry, T.field, T.rough]);
    p.scatter('tree', 0.55, [T.forest]);
    p.scatter('bush', 0.012, [T.grass, T.dry]);
    p.scatter('rock', 0.2, [T.rough]);
    p.scatter('reeds', 0.25, [T.shallow]);
    p.zone('south', 40, p.hm - 75, p.wm - 40, p.hm - 15, 0, -1);
    p.zone('north', 40, 15, p.wm - 40, 75, 0, 1);
    // Objectives: the west hill, the crossroads, the east hill.
    p.point('cp1', p.wm * 0.3, p.hm * 0.52);
    p.point('cp2', p.wm * 0.44, p.hm * 0.5);
    p.point('cp3', p.wm * 0.78, p.hm * 0.42);
    p.sea = -0.25;
  },
};

/** A flat, empty field: used by tests. */
export const FLAT: MapScript = {
  id: 'flat',
  name: 'Training Field',
  theme: 'meadow',
  w: 300,
  h: 240,
  build(p) {
    p.fill(T.grass);
    p.zone('south', 20, p.hm - 70, p.wm - 20, p.hm - 10, 0, -1);
    p.zone('north', 20, 10, p.wm - 20, 70, 0, 1);
    p.zone('all', 0, 0, p.wm, p.hm, 0, -1);
  },
};

/** A wall with one gap: used by pathfinding tests. */
export const WALLGAP: MapScript = {
  id: 'wallgap',
  name: 'Wall with a gap',
  theme: 'meadow',
  w: 200,
  h: 160,
  build(p) {
    p.fill(T.grass);
    p.rect(0, 78, 88, 84, T.wall);
    p.rect(104, 78, 200, 84, T.wall);
    p.lift(T.wall, 3);
    p.zone('south', 20, 120, 180, 150, 0, -1);
    p.zone('north', 20, 10, 180, 40, 0, 1);
  },
};
