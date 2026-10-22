import { FACTIONS, faction } from '../registry';
import { defaultArmy, groupDets } from '../../economy/armies';
import type { ArmySlotDef, ScenarioDef, ScenarioOption, ScenarioSideDef } from '../types';
import { mapChoice } from './blurbs';

/**
 * Sandbox: pick the ground, then up to four armies a side, each of any faction, made of any
 * units from any faction (as many as maxUnits). Rome and Greece against Persia, Spartans
 * against elephants: whatever the players like. Every army's faction is a lobby option keyed
 * by its slot ('a1'...'a4' on one side, 'b1'...'b4' on the other); 'none' leaves it out.
 */

export const SANDBOX_UNITS = 30;
const PER_SIDE = 4;
const SIDES = ['a', 'b'] as const;
/** Default line-up: Rome and Greece against Persia. */
const DEFAULTS: Record<string, string> = { a1: 'rome', a2: 'greece', b1: 'persia' };
/** The army an untouched slot brings (the AI's, until someone picks its units). */
const DEFAULT_GOLD = 3000;
const DEFAULT_UNITS = 12;

const MAPS: Record<string, { name: string; map: string; deploy: [string[], string[]] }> = {
  plains: { name: 'Open Plains', map: 'plains', deploy: [['south'], ['north']] },
  hills: { name: 'Rolling Hills', map: 'hills', deploy: [['south'], ['north']] },
  woods: { name: 'Woodland', map: 'woods', deploy: [['south'], ['north']] },
  desert: { name: 'Desert', map: 'desert', deploy: [['south'], ['north']] },
  river: { name: 'River Crossing', map: 'river', deploy: [['west'], ['east']] },
  hillfort: { name: 'Hill Camp', map: 'hillfort', deploy: [['fort_n', 'fort_w', 'fort_e', 'fort_c'], ['north', 'west', 'east', 'north']] },
  pass: { name: 'The Hot Gates', map: 'thermopylae', deploy: [['greeks_front', 'greeks_front', 'greeks_rear', 'greeks_rear'], ['persians']] },
};

export const slotKeys = (side: number): string[] => Array.from({ length: PER_SIDE }, (_, i) => `${SIDES[side]}${i + 1}`);

function configure(c: Record<string, string>): ScenarioDef {
  const m = MAPS[c.map ?? ''] ?? MAPS.plains!;
  const named = new Map<string, number>();
  const sides = SIDES.map((_, si): ScenarioSideDef => {
    let keys = slotKeys(si).filter((k) => (c[k] ?? 'none') !== 'none');
    // A side always has an army.
    if (!keys.length) keys = [slotKeys(si)[0]!];
    const slots = keys.map((key, j): ArmySlotDef => {
      const f = faction(c[key] && c[key] !== 'none' ? c[key] : (DEFAULTS[key] ?? 'rome'));
      const n = named.get(f.id) ?? 0;
      named.set(f.id, n + 1);
      const deploy = m.deploy[si]!;
      return {
        key,
        name: f.generalNames[n % f.generalNames.length]!,
        title: `The ${f.adjective} Army`,
        faction: f.id,
        deploy: deploy[j % deploy.length]!,
        ai: '',
        dets: groupDets(defaultArmy(f.id, DEFAULT_GOLD, DEFAULT_UNITS)),
      };
    });
    const names = [...new Set(slots.map((s) => faction(s.faction).name))];
    return { name: names.join(' & '), faction: slots[0]!.faction, role: 'neutral', slots };
  });
  return {
    id: 'sandbox',
    name: 'Sandbox',
    blurb: 'Pick the ground and the armies: any country, any units, as many as you like. Rome and Greece against Persia? Your call.',
    mode: 'sandbox',
    map: { id: m.map },
    deploySeconds: 90,
    victory: [{ k: 'rout' }],
    sandbox: { maxUnits: SANDBOX_UNITS },
    sides: [sides[0]!, sides[1]!],
  };
}

const NONE = { id: 'none', name: 'None' };
const factionChoices = FACTIONS.map((f) => ({ id: f.id, name: f.name }));

/** An army slot's faction: its default first (the first choice is the default), then the rest. */
function slotOption(key: string, i: number): ScenarioOption {
  const def = DEFAULTS[key];
  const choices = def ? [factionChoices.find((f) => f.id === def)!, ...factionChoices.filter((f) => f.id !== def), NONE] : [NONE, ...factionChoices];
  return { id: key, name: `Army ${i + 1}`, slot: key, choices };
}

export const SANDBOX: ScenarioDef = {
  ...configure({ ...DEFAULTS, map: 'plains' }),
  options: [
    { id: 'map', name: 'Battlefield', desc: 'On the open maps, hills, woods and oases move about from battle to battle.', choices: Object.entries(MAPS).map(([id, m]) => mapChoice(id, m.name)) },
    ...SIDES.flatMap((_, si) => slotKeys(si).map((k, i) => slotOption(k, i))),
  ],
  configure,
};
