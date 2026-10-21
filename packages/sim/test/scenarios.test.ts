import { describe, expect, it } from 'vitest';
import { Battle, FACTIONS, TICK_HZ, armyCost, defaultArmy, defaultSettings, groupDets, scenarioChoices, scenarioDef, validArmy } from '../src';
import { passableAt } from '../src/map/mapgen';
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
