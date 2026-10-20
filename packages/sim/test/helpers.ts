import { Battle, defaultSettings, type Settings } from '../src';
import { spawnUnit } from '../src/setup';
import type { Army, Detachment } from '../src/types';

/** An empty duel battle on the flat map; add units with place(). */
export function emptyBattle(settings: Partial<Settings> = {}, seed = 7, scenario = 'duel'): Battle {
  const b = Battle.create({ seed, scenario, settings: { ...defaultSettings(), ...settings }, players: [] });
  // Remove the auto-spawned generals so tests control every unit.
  const w = b.world;
  w.soldiers = [];
  w.units = [];
  for (const d of w.dets) d.units = [];
  for (const a of w.armies) {
    a.genUnit = 0;
    a.genSoldier = 0;
  }
  // Keep the battle going even when a test leaves one side empty.
  w.scenario.vars.pending0 = 1;
  w.scenario.vars.pending1 = 1;
  b.reindex();
  return b;
}

export function place(b: Battle, side: number, type: string, x: number, y: number, fx: number, fy: number, n?: number) {
  const w = b.world;
  const army = w.armies.find((a) => a.side === side) as Army;
  const det = w.dets.find((d) => d.army === army.id) as Detachment;
  const u = spawnUnit(w, army, det, type, x, y, fx, fy, n ?? 20);
  b.reindex();
  return u;
}

export function run(b: Battle, seconds: number, cmds: (tick: number) => import('../src').TaggedCommand[] = () => []): void {
  const end = b.world.tick + seconds * 20;
  while (b.world.tick < end && !b.world.result) b.step(cmds(b.world.tick));
}
