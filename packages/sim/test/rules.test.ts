import { describe, expect, it } from 'vitest';
import { buildMap, findPath, MOVE, TERRAIN } from '../src';
import { orderAttack, orderMove, setFormation } from '../src/commands';
import { emptyBattle, place, run } from './helpers';

describe('combat rules', () => {
  it('braced spearmen beat a frontal cavalry charge', () => {
    const results = [1, 2, 3].map((seed) => {
      const b = emptyBattle({}, seed);
      const spears = place(b, 1, 'greece.hoplites', 150, 120, 0, 1, 24);
      setFormation(b, spears, 'phalanx');
      const cav = place(b, 0, 'rome.equites', 150, 190, 0, -1, 12);
      orderAttack(b, cav, spears.id, true, true);
      run(b, 25);
      return { cavLoss: 12 - cav.sol.length, spearLoss: 24 - spears.sol.length };
    });
    const cavLoss = results.reduce((s, r) => s + r.cavLoss, 0);
    const spearLoss = results.reduce((s, r) => s + r.spearLoss, 0);
    expect(cavLoss / 12).toBeGreaterThan(spearLoss / 24);
  });

  it('a charge into the rear breaks a unit faster than one into its front', () => {
    const breakTime = (fromRear: boolean, seed: number) => {
      const b = emptyBattle({}, seed);
      const victim = place(b, 1, 'rome.socii', 150, 120, 0, 1, 24);
      const front = place(b, 0, 'greece.hoplites', 150, 128, 0, -1, 24);
      orderAttack(b, front, victim.id, false, true);
      const cav = place(b, 0, 'greece.hippeis', 150, fromRear ? 60 : 175, 0, fromRear ? 1 : -1, 12);
      orderAttack(b, cav, victim.id, true, true);
      for (let t = 0; t < 20 * 90; t++) {
        b.step([]);
        if (victim.st === 'routing' || victim.st === 'gone') return t;
      }
      return 20 * 90;
    };
    const rear = [1, 2, 3].reduce((s, seed) => s + breakTime(true, seed), 0);
    const front = [1, 2, 3].reduce((s, seed) => s + breakTime(false, seed), 0);
    expect(rear).toBeLessThan(front);
  });

  it('archers run out of ammunition only when ammo is limited', () => {
    for (const ammo of [true, false]) {
      const b = emptyBattle({ ammo, morale: false });
      const archers = place(b, 1, 'greece.archers', 150, 60, 0, 1, 20);
      // 60 m away: inside the archers' 85 m range.
      place(b, 0, 'rome.triarii', 150, 120, 0, -1, 20);
      run(b, 200);
      if (ammo) expect(archers.ammo).toBe(0);
      else expect(archers.ammo).toBeGreaterThan(0);
    }
  });

  it('with morale switched off, nobody routs', () => {
    const b = emptyBattle({ morale: false });
    const weak = place(b, 0, 'greece.psiloi', 150, 120, 0, -1, 20);
    const strong = place(b, 1, 'greece.spartans', 150, 112, 0, 1, 20);
    orderAttack(b, strong, weak.id, true, true);
    let routed = false;
    for (let t = 0; t < 20 * 60 && weak.st !== 'gone'; t++) {
      b.step([]);
      if (weak.st === 'routing' || weak.st === 'shattered') routed = true;
    }
    expect(routed).toBe(false);
  });

  it('with fatigue switched off, running tires nobody', () => {
    const b = emptyBattle({ fatigue: false });
    const u = place(b, 0, 'rome.hastati', 40, 200, 1, 0, 24);
    u.order = { ...u.order, k: 'move', x: 260, y: 200, run: true };
    u.flags |= 128;
    run(b, 40);
    expect(u.fat).toBe(0);
  });
});

describe('maps and paths', () => {
  it('finds a way through the gap in a wall', () => {
    const map = buildMap({ id: 'wallgap', seed: 1, params: {} });
    const path = findPath(map, 40, 140, 40, 20, MOVE.foot);
    expect(path.length).toBeGreaterThan(2);
    // The path must pass through the gap (x between 88 and 104 at the wall's y).
    let through = false;
    for (let k = 0; k + 3 < path.length + 2; k += 2) {
      const ax = k === 0 ? 40 : path[k - 2]!;
      const ay = k === 0 ? 140 : path[k - 1]!;
      const bx = path[k]!;
      const by = path[k + 1]!;
      if ((ay - 81) * (by - 81) <= 0) {
        const x = ax + ((bx - ax) * (81 - ay)) / (by - ay || 1);
        through = x > 88 && x < 104;
      }
    }
    expect(through).toBe(true);
    for (let k = 0; k < path.length; k += 2) {
      const i = Math.floor(path[k]! / 2);
      const j = Math.floor(path[k + 1]! / 2);
      expect(TERRAIN[map.ter[j * map.w + i]!]!.speed[0]).toBeGreaterThan(0);
    }
  });

  it('squeezes a wide unit into a column to pass the gap', () => {
    const b = emptyBattle({}, 3, 'gap');
    const u = place(b, 0, 'rome.hastati', 60, 135, 0, -1, 24);
    expect(u.width).toBeGreaterThan(6);
    orderMove(b, u, 60, 25, 0, -1, 0, false, true);
    let narrowest = u.width;
    for (let t = 0; t < 20 * 150 && u.order.k === 'move'; t++) {
      b.step([]);
      narrowest = Math.min(narrowest, u.width);
    }
    run(b, 5);
    const c = b.center(u);
    expect(c.y).toBeLessThan(60);
    expect(narrowest).toBeLessThanOrEqual(6);
    expect(u.width).toBe(u.bw);
  });
});
