import { describe, expect, it } from 'vitest';
import { Battle, defaultSettings, HASH_EVERY } from '../src';

function hashes(seed: number, ticks: number): number[] {
  const b = Battle.create({ seed, scenario: 'field', settings: defaultSettings(), players: [] });
  const out: number[] = [];
  for (let t = 0; t < ticks; t++) {
    b.step([]);
    if (b.world.tick % HASH_EVERY === 0) out.push(b.hash());
  }
  return out;
}

describe('determinism', () => {
  it('replays the same battle identically from the same seed', () => {
    const a = hashes(42, 2400);
    const b = hashes(42, 2400);
    expect(a).toEqual(b);
    expect(hashes(43, 400)).not.toEqual(a.slice(0, 20));
  });

  it('continues identically after save and restore mid-battle', () => {
    const settings = defaultSettings();
    const live = Battle.create({ seed: 9, scenario: 'field', settings, players: [] });
    for (let t = 0; t < 1500; t++) live.step([]);
    const restored = Battle.load(live.serialize());
    expect(restored.hash()).toBe(live.hash());
    for (let t = 0; t < 1500; t++) {
      live.step([]);
      restored.step([]);
      if (live.world.tick % HASH_EVERY === 0) expect(restored.hash()).toBe(live.hash());
    }
    expect(restored.serialize()).toBe(live.serialize());
  });

  it('applies player commands the same way on every computer', () => {
    const setup = {
      seed: 5,
      scenario: 'field',
      settings: defaultSettings(),
      players: [{ id: 1, name: 'Alex', role: 'general' as const, slot: 'rome-a', det: 0 }],
    };
    const a = Battle.create(setup);
    const b = Battle.create(setup);
    const myUnits = a.world.units.filter((u) => u.army === a.world.armies[0]!.id).map((u) => u.id);
    const script = (tick: number) =>
      tick === 0 ? [{ p: 1, c: { k: 'ready' as const, on: true } }] : tick === 40 ? [{ p: 1, c: { k: 'move' as const, u: myUnits, x: 200, y: 150, run: true } }] : [];
    for (let t = 0; t < 1200; t++) {
      a.step(script(t));
      b.step(script(t));
    }
    expect(a.world.phase).toBe('battle');
    expect(a.hash()).toBe(b.hash());
  });
});
