import { describe, expect, it } from 'vitest';
import { Battle, FACTIONS, TICK_HZ, armyCost, defaultArmy, defaultSettings, groupDets, recruitedArmy, scenarioChoices, scenarioDef, validArmy } from '../src';
import { dryAt, passableAt } from '../src/map/mapgen';
import { moveMask } from '../src/units/movement';

function thermopylae(seed: number): Battle {
  return Battle.create({ seed, scenario: 'thermopylae', settings: defaultSettings(), players: [] });
}

describe('Thermopylae', () => {
  it('puts every soldier on ground he can stand on', () => {
    const b = thermopylae(4);
    for (const s of b.world.soldiers) {
      const u = b.unit(s.u)!;
      expect(passableAt(b.map, s.x, s.y, moveMask(b.typeOf(u)))).toBe(true);
    }
  });

  it("sends the King's host, the waves and then the Immortals over the mountain", () => {
    const b = thermopylae(4);
    const w = b.world;
    while (!w.result && w.tick < 9 * 60 * TICK_HZ) b.step([]);
    const slots = w.armies.map((a) => a.slot);
    expect(slots).toContain('xerxes');
    expect(slots).toContain('immortals');
    expect(w.scenario.wave).toBeGreaterThanOrEqual(3);
    // The Persians can't be beaten while the King still has men to send.
    expect(w.scenario.vars.pending1).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const run = (): number => {
      const b = thermopylae(9);
      while (b.world.tick < 3 * 60 * TICK_HZ) b.step([]);
      return b.hash();
    };
    expect(run()).toBe(run());
  });
});

describe('Gold modes', () => {
  it('builds balanced default armies within budget for every faction', () => {
    for (const f of FACTIONS) {
      const units = defaultArmy(f.id, 3000, 12);
      expect(units.length).toBeGreaterThan(3);
      expect(armyCost(units)).toBeLessThanOrEqual(3000);
      expect(validArmy(f.id, units, 3000, 12)).toBe(true);
      expect(groupDets(units).flatMap((d) => d.units).sort()).toEqual([...units].sort());
    }
  });

  it('configures a scenario from lobby choices', () => {
    const sc = scenarioDef('laststand', { map: 'river', faction: 'macedon', enemy: 'persia' });
    expect(sc.map.id).toBe('river');
    expect(sc.sides[0].faction).toBe('macedon');
    expect(sc.sides[1].faction).toBe('persia');
    expect(scenarioChoices('laststand', { map: 'nowhere' }).map).toBe('hillfort');
  });

  it('Last Stand sends waves and pays for beating them', () => {
    const b = Battle.create({ seed: 5, scenario: 'laststand', options: { map: 'hillfort' }, settings: { ...defaultSettings(), difficulty: 0 }, players: [] });
    const w = b.world;
    while (!w.result && w.tick < 6 * 60 * TICK_HZ) b.step([]);
    expect(w.scenario.wave).toBeGreaterThanOrEqual(2);
    expect(w.sides[0]!.score).toBeGreaterThanOrEqual(1);
    expect(w.armies.some((a) => a.slot.startsWith('wave2-'))).toBe(true);
  });

  it('Capture & Hold scores victory points for held points', () => {
    const b = Battle.create({ seed: 6, scenario: 'capture', settings: defaultSettings(), players: [] });
    const w = b.world;
    expect(w.objectives.length).toBe(3);
    while (!w.result && w.tick < 4 * 60 * TICK_HZ) b.step([]);
    expect(w.objectives.some((o) => o.owner >= 0)).toBe(true);
    expect(w.sides[0]!.score + w.sides[1]!.score).toBeGreaterThan(0);
  });
});

describe('Allied generals', () => {
  const setup = () => {
    const b = Battle.create({
      seed: 3,
      scenario: 'laststand',
      options: { map: 'pass' },
      settings: defaultSettings(),
      players: [{ id: 1, name: 'Alex', role: 'general', slot: 'ls1', det: 0 }],
    });
    b.step([{ p: 1, c: { k: 'ready', on: true } }]);
    const w = b.world;
    const ally = w.armies.find((a) => a.slot === 'ls2')!;
    // Wait for the first enemies.
    while (!w.units.some((u) => u.side === 1 && u.st !== 'gone') && w.tick < 120 * TICK_HZ) b.step([]);
    const centre = (side: number, army?: number) => {
      const us = w.units.filter((u) => u.side === side && u.st !== 'gone' && (army === undefined || u.army === army) && u.id !== b.army(u.army)!.genUnit);
      let x = 0;
      let y = 0;
      for (const u of us) {
        x += b.center(u).x;
        y += b.center(u).y;
      }
      return { x: x / us.length, y: y / us.length };
    };
    return { b, w, ally, centre };
  };

  it('attacks when a general asks', () => {
    const { b, w, ally, centre } = setup();
    // How far the allied army has marched toward where the enemy was.
    const start = centre(0, ally.id);
    const foe = centre(1);
    const dir = { x: foe.x - start.x, y: foe.y - start.y };
    const dl = Math.hypot(dir.x, dir.y);
    const advanced = () => {
      const a = centre(0, ally.id);
      return ((a.x - start.x) * dir.x + (a.y - start.y) * dir.y) / dl;
    };
    // Only allied AI armies take the order: not your own, nor the enemy's.
    const enemy = w.armies.find((a) => a.side === 1)!;
    b.step([{ p: 1, c: { k: 'ally', a: enemy.id, o: 'assault' } }, { p: 1, c: { k: 'ally', a: w.armies[0]!.id, o: 'assault' } }]);
    expect(enemy.ai.cmd).toBe('');
    expect(w.armies[0]!.ai.cmd).toBe('');
    b.step([{ p: 1, c: { k: 'ally', a: ally.id, o: 'assault' } }]);
    expect(ally.ai.plan).toBe('assault');
    for (let t = 0; t < 40 * TICK_HZ; t++) b.step([]);
    expect(advanced()).toBeGreaterThan(40);
  });

  it('holds the place a general picks', () => {
    const { b, ally, centre } = setup();
    const c = centre(0, ally.id);
    const x = c.x;
    const y = c.y + (c.y > b.map.hm / 2 ? -40 : 40);
    b.step([{ p: 1, c: { k: 'ally', a: ally.id, o: 'hold', x, y } }]);
    for (let t = 0; t < 50 * TICK_HZ; t++) b.step([]);
    const now = centre(0, ally.id);
    expect(Math.hypot(now.x - x, now.y - y)).toBeLessThan(25);
    expect(ally.ai.plan).toBe('defend');
  });
});

describe('Sandbox', () => {
  it('builds any line-up on any ground, with armies of any units', () => {
    const options = { map: 'desert', a1: 'rome', a2: 'greece', b1: 'persia', b2: 'none', b3: 'carthage' };
    const sc = scenarioDef('sandbox', options);
    const units = ['greece.blackspartans', 'carthage.elephants', 'rome.hastati'];
    const army = recruitedArmy(sc, 'a1', units)!;
    const b = Battle.create({ seed: 2, scenario: 'sandbox', options, armies: [army], settings: defaultSettings(), players: [] });
    const w = b.world;
    expect(b.map.name).toBe('Desert');
    expect(w.armies.map((a) => `${a.faction}:${a.side}`)).toEqual(['rome:0', 'greece:0', 'persia:1', 'carthage:1']);
    const mine = w.units.filter((u) => u.army === w.armies[0]!.id && u.id !== w.armies[0]!.genUnit).map((u) => u.type);
    expect(mine.sort()).toEqual([...units].sort());
    // No gold in a sandbox.
    expect(w.armies.every((a) => a.gold === 0)).toBe(true);
    for (const s of w.soldiers) expect(passableAt(b.map, s.x, s.y, moveMask(b.typeOf(b.unit(s.u)!)))).toBe(true);
    // The armies march across and fight.
    while (!w.result && w.tick < 180 * TICK_HZ) b.step([]);
    expect(w.armies.reduce((n, a) => n + a.losses, 0)).toBeGreaterThan(0);
  });

  it('lets units be placed anywhere at deployment, the host place the AI too, and never in the water', () => {
    const options = { map: 'plains', a1: 'rome', b1: 'persia' };
    const b = Battle.create({
      seed: 4,
      scenario: 'sandbox',
      options,
      settings: defaultSettings(),
      players: [
        { id: 1, name: 'Host', role: 'general', slot: 'a1', det: 0, host: true },
        { id: 2, name: 'Guest', role: 'spectator', slot: '', det: 0 },
      ],
    });
    const w = b.world;
    expect(w.phase).toBe('deploy');
    const mine = w.units.find((u) => u.army === w.armies[0]!.id && u.id !== w.armies[0]!.genUnit)!;
    const theirs = w.units.find((u) => u.army === w.armies[1]!.id && u.id !== w.armies[1]!.genUnit)!;
    // Far outside the starting zone (the middle of the map), and the AI's unit by the host only.
    b.step([{ p: 1, c: { k: 'deploy', u: mine.id, x: 120, y: 150, dx: 0, dy: -1 } }]);
    b.step([{ p: 2, c: { k: 'deploy', u: theirs.id, x: 300, y: 200, dx: 0, dy: 1 } }]);
    expect(Math.hypot(mine.ax - 120, mine.ay - 150)).toBeLessThan(4);
    expect(Math.hypot(theirs.ax - 300, theirs.ay - 200)).toBeGreaterThan(20);
    b.step([{ p: 1, c: { k: 'deploy', u: theirs.id, x: 300, y: 200, dx: 0, dy: 1 } }]);
    expect(Math.hypot(theirs.ax - 300, theirs.ay - 200)).toBeLessThan(20);
    // Dropped in the stream: it forms up on the bank instead.
    const stream = { x: b.map.wm * 0.66, y: b.map.hm * 0.5 };
    b.step([{ p: 1, c: { k: 'deploy', u: mine.id, x: stream.x, y: stream.y, dx: 0, dy: -1 } }]);
    for (const id of mine.sol) {
      const sl = b.soldier(id)!;
      expect(dryAt(b.map, sl.x, sl.y)).toBe(true);
    }
  });
});
