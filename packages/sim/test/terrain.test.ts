import { describe, expect, it } from 'vitest';
import { Battle, MOVE, T, TERRAIN, TICK_HZ, buildMap, defaultSettings, findPath, heightAt, terrainAt } from '../src';
import { registerMap } from '../src/map/mapgen';
import { orderAttack } from '../src/commands';
import { emptyBattle, place, run } from './helpers';

// A meadow with a long strip of shallows across the middle of the straight route.
registerMap({
  id: 'test-shore',
  name: 'Shore',
  theme: 'meadow',
  w: 120,
  h: 60,
  build(p) {
    p.fill(T.grass);
    p.rect(30, 20, 90, 30, T.shallow);
  },
});

/** Terrain types along a path, sampled every half metre. */
function along(map: ReturnType<typeof buildMap>, sx: number, sy: number, path: number[]): Set<number> {
  const seen = new Set<number>();
  let x = sx;
  let y = sy;
  for (let i = 0; i < path.length; i += 2) {
    const nx = path[i]!;
    const ny = path[i + 1]!;
    const steps = Math.max(1, Math.ceil(Math.hypot(nx - x, ny - y) / 0.5));
    for (let s = 0; s <= steps; s++) seen.add(terrainAt(map, x + ((nx - x) * s) / steps, y + ((ny - y) * s) / steps));
    x = nx;
    y = ny;
  }
  return seen;
}

describe('terrain', () => {
  it('walks round shallows when dry ground is close by', () => {
    const map = buildMap({ id: 'test-shore', seed: 1, params: {} });
    const path = findPath(map, 20, 25, 100, 25, MOVE.foot);
    expect(path.length).toBeGreaterThan(0);
    expect(path.slice(-2)).toEqual([100, 25]);
    expect(along(map, 20, 25, path).has(T.shallow)).toBe(false);
  });

  it('still wades a ford when it is the only way across', () => {
    const map = buildMap({ id: 'river', seed: 1, params: {} });
    // North of the bridge, the north ford is the crossing.
    const path = findPath(map, 120, 62, 320, 62, MOVE.foot);
    expect(path.slice(-2)).toEqual([320, 62]);
    expect(along(map, 120, 62, path).has(T.shallow)).toBe(true);
  });

  it('keeps ground flat beside walls and cliffs, and dry ground above the sea', () => {
    const map = buildMap({ id: 'thermopylae', seed: 480, params: {} });
    const W = map.w + 1;
    for (let j = 0; j < map.h; j++) {
      for (let i = 0; i < map.w; i++) {
        const k = j * map.w + i;
        if (!(map.pass[k]! & MOVE.foot)) continue;
        const near = [k - 1, k + 1, k - map.w, k + map.w].some((n) => n >= 0 && n < map.w * map.h && map.ter[n] === T.wall);
        if (!near) continue;
        for (const c of [j * W + i, j * W + i + 1, (j + 1) * W + i, (j + 1) * W + i + 1]) expect(map.hgt[c]!).toBeLessThan(1.5);
      }
    }
    // Walls are still there to draw, as blocks.
    expect(Math.max(...map.top)).toBeGreaterThan(2);
  });

  it('nobody stands up a cliff or on the wall at Thermopylae', () => {
    const b = Battle.create({ seed: 3, scenario: 'thermopylae', settings: defaultSettings(), players: [] });
    const w = b.world;
    while (!w.result && w.tick < 4 * 60 * TICK_HZ) {
      b.step([]);
      if (w.tick % 100 !== 0) continue;
      for (const s of w.soldiers) {
        const ter = terrainAt(b.map, s.x, s.y);
        // The mountain path climbs on purpose; everywhere else is the coastal flat.
        const onPath = (ter === T.rough || ter === T.dirt) && s.y > 195;
        if (!onPath) expect(heightAt(b.map, s.x, s.y)).toBeLessThan(2.5);
        expect(TERRAIN[ter]!.speed[0]).toBeGreaterThan(0);
      }
    }
  });
});

describe('strength', () => {
  it('multiplies health and damage, so a stronger side wins an even fight', () => {
    const b = emptyBattle({ morale: false, strength: [3, 1] });
    const strong = place(b, 0, 'greece.hoplites', 150, 126, 0, -1, 20);
    const weak = place(b, 1, 'greece.hoplites', 150, 114, 0, 1, 20);
    const hp = (u: typeof strong): number => b.soldier(u.sol[1]!)!.hp;
    expect(hp(strong)).toBeCloseTo(hp(weak) * 3);
    orderAttack(b, strong, weak.id, false, true);
    orderAttack(b, weak, strong.id, false, true);
    run(b, 90);
    expect(weak.sol.length).toBeLessThan(strong.sol.length);
  });
});
