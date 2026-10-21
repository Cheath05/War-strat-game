import { FACTIONS, faction } from '../registry';
import { defaultArmy, groupDets } from '../../economy/armies';
import type { ArmySlotDef, ScenarioDef } from '../types';

/**
 * Last Stand: up to four armies hold a strong position against ever bigger waves. Gold
 * before the battle buys the army; beating a wave earns more for reinforcements.
 */

export const LS_GOLD = 3000;
export const LS_WAVES = 10;

const MAPS: Record<string, { map: string; seed: number; deploy: string[]; spawns: string[] }> = {
  hillfort: { map: 'hillfort', seed: 31, deploy: ['fort_n', 'fort_w', 'fort_e', 'fort_c'], spawns: ['north', 'west', 'east'] },
  river: { map: 'river', seed: 32, deploy: ['east', 'east', 'east', 'east'], spawns: ['west_edge'] },
  pass: { map: 'thermopylae', seed: 480, deploy: ['greeks_front', 'greeks_front', 'greeks_rear', 'greeks_rear'], spawns: ['persians'] },
};
const TITLES = ['Vanguard', 'Left Wing', 'Right Wing', 'Reserve'];

function configure(c: Record<string, string>): ScenarioDef {
  const m = MAPS[c.map ?? ''] ?? MAPS.hillfort!;
  const us = faction(c.faction ?? 'rome');
  const them = faction(c.enemy ?? 'carthage');
  const slots: ArmySlotDef[] = m.deploy.map((deploy, i) => ({
    key: `ls${i + 1}`,
    name: us.generalNames[i % us.generalNames.length]!,
    title: `The ${us.adjective} ${TITLES[i]}`,
    faction: us.id,
    deploy,
    ai: 'hold',
    dets: groupDets(defaultArmy(us.id, LS_GOLD, 12)),
  }));
  return {
    id: 'laststand',
    name: 'Last Stand',
    blurb: `Hold out against ${LS_WAVES} ever bigger waves. Recruit with gold, and earn more for every wave you beat.`,
    mode: 'laststand',
    map: { id: m.map, seed: m.seed },
    deploySeconds: 60,
    victory: [{ k: 'rout' }],
    recruit: { gold: LS_GOLD, maxUnits: 12, sides: [0], income: 0 },
    waves: { zones: m.spawns, count: LS_WAVES },
    sides: [
      { name: us.name, faction: us.id, role: 'defender', slots },
      {
        name: them.name,
        faction: them.id,
        role: 'attacker',
        aiOnly: true,
        slots: [{ key: 'waves', name: them.generalNames[0]!, title: 'The Horde', faction: them.id, deploy: m.spawns[0]!, ai: 'assault', reserve: true, dets: [] }],
      },
    ],
  };
}

const factions = FACTIONS.map((f) => ({ id: f.id, name: f.name }));

export const LAST_STAND: ScenarioDef = {
  ...configure({}),
  options: [
    {
      id: 'map',
      name: 'Battlefield',
      choices: [
        { id: 'hillfort', name: 'The Hill Fort' },
        { id: 'river', name: 'The River Crossing' },
        { id: 'pass', name: 'The Hot Gates' },
      ],
    },
    { id: 'faction', name: 'Your faction', choices: factions },
    { id: 'enemy', name: 'The enemy', choices: [...factions.filter((f) => f.id === 'carthage'), ...factions.filter((f) => f.id !== 'carthage')] },
  ],
  configure,
};
