import { FACTIONS, faction } from '../registry';
import { defaultArmy, groupDets } from '../../economy/armies';
import type { ArmySlotDef, FactionDef, ScenarioDef } from '../types';
import { mapChoice } from './blurbs';

// Objective battles for co-op or PVP: Capture & Hold (victory points for holding three
// points) and Defend the Bridge (the attackers must get across the river in time).

const CH_GOLD = 4000;
const factions = FACTIONS.map((f) => ({ id: f.id, name: f.name }));
const first = (id: string): { id: string; name: string }[] => [...factions.filter((f) => f.id === id), ...factions.filter((f) => f.id !== id)];

function armies(f: FactionDef, prefix: string, deploy: string[], ai: string[], gold: number, from = 0): ArmySlotDef[] {
  return deploy.map((z, i) => ({
    key: `${prefix}${i + 1}`,
    name: f.generalNames[(from + i) % f.generalNames.length]!,
    title: `The ${f.adjective} ${i === 0 ? 'Main Army' : 'Second Army'}`,
    faction: f.id,
    deploy: z,
    ai: ai[i] ?? ai[0]!,
    dets: groupDets(defaultArmy(f.id, gold, 12)),
  }));
}

/** Side names, kept apart when both sides pick the same faction. */
function names(a: FactionDef, b: FactionDef, tags: [string, string]): [string, string] {
  return a.id === b.id ? [`${a.name} (${tags[0]})`, `${b.name} (${tags[1]})`] : [a.name, b.name];
}

const CH_MAPS: Record<string, { map: string; seed: number; zones: [string, string]; tags: [string, string]; points: string[] }> = {
  plains: { map: 'plains', seed: 41, zones: ['south', 'north'], tags: ['South', 'North'], points: ['the West Hill', 'the Crossroads', 'the East Hill'] },
  river: { map: 'river', seed: 42, zones: ['east', 'west'], tags: ['East', 'West'], points: ['the Bridge', 'the North Ford', 'the South Ford'] },
  hillfort: { map: 'hillfort', seed: 43, zones: ['fort_c', 'north'], tags: ['Fort', 'North'], points: ['the North Gate', 'the West Gate', 'the East Gate'] },
};

function captureHold(c: Record<string, string>): ScenarioDef {
  const m = CH_MAPS[c.map ?? ''] ?? CH_MAPS.plains!;
  const a = faction(c.side0 ?? 'rome');
  const b = faction(c.side1 ?? 'macedon');
  const [n0, n1] = names(a, b, m.tags);
  return {
    id: 'capture',
    name: 'Capture & Hold',
    blurb: 'Three points on the field. Each one you hold scores a victory point a second: first to 1200 wins.',
    mode: 'objective',
    map: { id: m.map, seed: m.seed },
    deploySeconds: 60,
    victory: [{ k: 'points', target: 1200 }, { k: 'rout' }, { k: 'deadline', seconds: 20 * 60 }],
    recruit: { gold: CH_GOLD, maxUnits: 12, income: 60 },
    objectives: m.points.map((name, i) => ({ at: `cp${i + 1}`, name, r: 14 })),
    sides: [
      { name: n0, faction: a.id, role: 'attacker', slots: armies(a, 'a', [m.zones[0], m.zones[0]], ['capture'], CH_GOLD) },
      { name: n1, faction: b.id, role: 'attacker', slots: armies(b, 'b', [m.zones[1], m.zones[1]], ['capture'], CH_GOLD, 2) },
    ],
  };
}

export const CAPTURE_HOLD: ScenarioDef = {
  ...captureHold({}),
  options: [
    {
      id: 'map',
      name: 'Battlefield',
      choices: [mapChoice('plains', 'Open Plains'), mapChoice('river', 'The River Crossing'), mapChoice('hillfort', 'The Hill Fort')],
    },
    { id: 'side0', name: 'First side', desc: "The first side's country: its armies and the units they can recruit.", choices: factions },
    { id: 'side1', name: 'Second side', desc: "The second side's country.", choices: first('macedon') },
  ],
  configure: captureHold,
};

function bridge(c: Record<string, string>): ScenarioDef {
  const d = faction(c.defenders ?? 'greece');
  const at = faction(c.attackers ?? 'persia');
  const [n0, n1] = names(d, at, ['Defenders', 'Attackers']);
  return {
    id: 'bridge',
    name: 'Defend the Bridge',
    blurb: 'The attackers must force sixty men across the river, by the bridge or the fords, within fifteen minutes.',
    mode: 'objective',
    map: { id: 'river', seed: 44 },
    deploySeconds: 60,
    victory: [{ k: 'zone', zone: 'east_bank', side: 1, count: 60 }, { k: 'timer', winner: 0, seconds: 15 * 60 }, { k: 'rout' }],
    recruit: { gold: 4000, goldBySide: [3500, 5500], maxUnits: 12, income: 50 },
    sides: [
      { name: n0, faction: d.id, role: 'defender', slots: armies(d, 'd', ['east', 'east'], ['hold'], 3500) },
      { name: n1, faction: at.id, role: 'attacker', slots: armies(at, 'x', ['west', 'west'], ['zone:east_bank', 'route:ford_n'], 5500, 2) },
    ],
  };
}

export const BRIDGE: ScenarioDef = {
  ...bridge({}),
  options: [
    { id: 'defenders', name: 'Defenders', desc: 'The country holding the far bank.', choices: first('greece') },
    { id: 'attackers', name: 'Attackers', desc: 'The country that must force its way across.', choices: first('persia') },
  ],
  configure: bridge,
};
