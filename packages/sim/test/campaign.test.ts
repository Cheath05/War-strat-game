import { describe, expect, it } from 'vitest';
import {
  Battle,
  HASH_EVERY,
  TICK_HZ,
  battleDef,
  campaignArmy,
  defaultSettings,
  judge,
  listBattles,
  noUpgrades,
  rankOf,
  readSurvivors,
  scenarioDef,
  slotKey,
  unitBonus,
  unitType,
  type RosterUnit,
} from '../src';
import { dryAt, passableAt } from '../src/map/mapgen';
import { moveMask } from '../src/units/movement';
import { emptyBattle, place, run } from './helpers';

describe('Upgrades and veterancy', () => {
  it('make a unit fight better', () => {
    // Two identical fights; in the second, one side has the best upgrades and veteran men.
    const fight = (boost: boolean): number => {
      const b = emptyBattle({ morale: false }, 5);
      const a = place(b, 0, 'rome.hastati', 150, 130, 0, -1, 30);
      place(b, 1, 'rome.hastati', 150, 122, 0, 1, 30);
      if (boost) a.up = unitBonus('rome.hastati', { line: [3, 3, 3], missile: [0, 0, 0], horse: [0, 0, 0] }, 3);
      run(b, 40);
      return a.losses;
    };
    expect(fight(true)).toBeLessThan(fight(false) * 0.7);
  });

  it('adds up by arm and rank', () => {
    expect(unitBonus('rome.hastati', noUpgrades(), 0)).toEqual({ atk: 0, def: 0, armor: 0, morale: 0 });
    const up = { line: [1, 2, 0], missile: [3, 3, 3], horse: [0, 0, 0] };
    // Infantry: one level of weapons, two of armour; the missile troops' upgrades don't apply.
    expect(unitBonus('rome.hastati', up, 0)).toEqual({ atk: 3, def: 2, armor: 12, morale: 0 });
    expect(unitBonus('rome.velites', up, 1)).toEqual({ atk: 9 + 2, def: 3 + 6 + 2, armor: 18, morale: 18 + 5 });
  });
});

describe('Campaign armies', () => {
  const cannae = (side: number, diff = 1, roster?: RosterUnit[]) => {
    const sc = scenarioDef('campaign', { battle: 'cannae', side: String(side), diff: String(diff) });
    const slot = slotKey(side, 0);
    const armies = roster ? [campaignArmy(sc, slot, roster, { line: [2, 0, 0], missile: [0, 0, 0], horse: [0, 0, 0] })!] : undefined;
    return Battle.create({
      seed: 3,
      scenario: 'campaign',
      options: { battle: 'cannae', side: String(side), diff: String(diff) },
      settings: defaultSettings(),
      armies,
      players: [{ id: 1, name: 'Me', role: 'general', slot, det: 0, host: true }],
    });
  };

  it('bring depleted veterans into battle with their upgrades, and read the survivors back', () => {
    const roster: RosterUnit[] = [
      { id: 'u1', type: 'rome.hastati', str: 0.5, kills: 200 },
      { id: 'u2', type: 'rome.principes', str: 1, kills: 0 },
      { id: 'u3', type: 'rome.velites', str: 0.75, kills: 10 },
    ];
    const b = cannae(0, 1, roster);
    const w = b.world;
    const mine = w.units.filter((u) => u.army === w.armies[0]!.id && u.ref);
    expect(mine.map((u) => u.ref).sort()).toEqual(['u1', 'u2', 'u3']);
    const u1 = mine.find((u) => u.ref === 'u1')!;
    expect(u1.sol.length).toBe(Math.round(unitType('rome.hastati').size * 0.5));
    expect(u1.vet).toBe(rankOf(roster[0]!));
    expect(u1.vet).toBe(3);
    expect(u1.up).toEqual(unitBonus('rome.hastati', { line: [2, 0, 0], missile: [0, 0, 0], horse: [0, 0, 0] }, 3));
    // Fight a while; the survivors come back with what's left of them.
    b.step([{ p: 1, c: { k: 'ready', on: true } }]);
    for (let t = 0; t < 3 * 60 * TICK_HZ; t++) b.step([]);
    const back = readSurvivors(b, slotKey(0, 0));
    expect([...back.keys()].sort()).toEqual(['u1', 'u2', 'u3']);
    for (const u of mine) {
      const full = unitType(u.type).size;
      expect(back.get(u.ref)!.str).toBeCloseTo((u.max - u.losses) / full, 5);
      expect(back.get(u.ref)!.kills).toBe(u.kills);
    }
  });

  it('scales the enemy with the difficulty, never the player', () => {
    const count = (diff: number, side: number) => {
      const b = cannae(0, diff);
      return b.world.units.filter((u) => u.side === side).length;
    };
    expect(count(0, 1)).toBeLessThan(count(1, 1));
    expect(count(3, 1)).toBeGreaterThan(count(1, 1));
    expect(count(0, 0)).toBe(count(3, 0));
  });

  it('replays a campaign battle identically', () => {
    const hashes = () => {
      const b = cannae(1, 2);
      b.step([{ p: 1, c: { k: 'ready', on: true } }]);
      const out: number[] = [];
      for (let t = 0; t < 1200; t++) {
        b.step([]);
        if (b.world.tick % HASH_EVERY === 0) out.push(b.hash());
      }
      return out;
    };
    expect(hashes()).toEqual(hashes());
  });
});

describe('Campaign battles', () => {
  it('every battle builds from both sides, every army on dry ground', () => {
    for (const battle of listBattles()) {
      if (battle.scenario) continue;
      for (const side of [0, 1]) {
        for (const diff of [0, 3]) {
          const b = Battle.create({ seed: 1, scenario: 'campaign', options: { battle: battle.id, side: String(side), diff: String(diff) }, settings: defaultSettings(), players: [] });
          const w = b.world;
          // Every army that starts on the field is there (reserves come later).
          const starting = battle.sides.flatMap((s) => s.armies.filter((a) => a.arrive === undefined)).length;
          expect(w.armies.length, `${battle.id} armies`).toBe(starting);
          for (const s of w.soldiers) {
            const u = b.unit(s.u)!;
            expect(passableAt(b.map, s.x, s.y, moveMask(b.typeOf(u))), `${battle.id}: ${u.type} in a wall`).toBe(true);
          }
          const wet = w.soldiers.filter((s) => !dryAt(b.map, s.x, s.y)).length;
          expect(wet, `${battle.id}: men in water`).toBeLessThan(w.soldiers.length * 0.02);
        }
      }
    }
  });

  it('stampedes the beasts at their moment in history', () => {
    // Beneventum: at 150 s Pyrrhus' elephants panic and run.
    const b = Battle.create({ seed: 1, scenario: 'campaign', options: { battle: 'beneventum', side: '0', diff: '1' }, settings: defaultSettings(), players: [] });
    const w = b.world;
    const elephants = () => w.units.filter((u) => u.side === 1 && b.typeOf(u).cls === 'ele');
    expect(elephants().length).toBeGreaterThan(0);
    while (!w.result && w.scenario.t <= 150 * TICK_HZ) b.step([]);
    expect(w.result).toBeNull();
    for (const u of elephants()) expect(['routing', 'shattered', 'gone']).toContain(u.st);
  });

  it('judges bonus objectives only for the winner', () => {
    const b = Battle.create({ seed: 2, scenario: 'campaign', options: { battle: 'cannae', side: '1', diff: '0' }, settings: defaultSettings(), players: [] });
    const w = b.world;
    while (!w.result && w.tick < 25 * 60 * TICK_HZ) b.step([]);
    expect(w.result).not.toBeNull();
    const battle = battleDef('cannae');
    const winner = w.result!.winner;
    for (const side of [0, 1]) {
      for (const o of battle.bonus[side]!) {
        const ok = judge(b, o, side, slotKey(side, 0));
        if (side !== winner) expect(ok).toBe(false);
      }
    }
    // The winner's general-survives objective is judged from the army.
    const army = w.armies.find((a) => a.slot === slotKey(winner, 0))!;
    expect(judge(b, { k: 'general', glory: 1 }, winner, slotKey(winner, 0))).toBe(!army.genDead);
  });
});
