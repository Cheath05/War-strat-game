// Campaigns: each country's road through its famous battles. A battle is defined once, with
// both sides' armies, and played from either side by the campaigns that include it.

import type { ScenarioEvent, VictoryRule } from '../data/types';

/** One army in a historical battle. */
export interface BattleArmy {
  /** The general's name. */
  general: string;
  title: string;
  faction: string;
  /** Deployment zone on the battle's map. */
  zone: string;
  /** AI directive: '' (its own judgement), 'assault', 'defend', 'hold', 'route:x', 'zone:x', 'wait:N'. */
  ai?: string;
  /** Its units, e.g. 'rome.hastati*4, rome.velites*2'. */
  units: string;
  /** Seconds into the battle it marches on (it isn't on the field before). */
  arrive?: number;
  /** Unit type of the general's guard (default: the faction's). */
  guard?: string;
}

export interface BattleSide {
  name: string;
  armies: BattleArmy[];
}

/** A bonus objective, judged on how the battle ended. Glory is its reward. */
export type Objective = { glory: number; text?: string } & (
  | { k: 'time'; min: number }
  | { k: 'losses'; pct: number }
  | { k: 'general' }
  | { k: 'killGeneral'; army?: number }
  | { k: 'destroy'; what: string; cls?: string[]; types?: string[] }
  | { k: 'hold'; point: string; what: string }
  | { k: 'kills'; share: number }
);

export interface BattleDef {
  id: string;
  name: string;
  year: string;
  place: string;
  /** What happened, in a few sentences. */
  history: string;
  /** Who won in history: 0 or 1 (the side), to mark a changed history. */
  winner: number;
  map: { id: string; seed?: number; params?: Record<string, number> };
  sides: [BattleSide, BattleSide];
  /** How the battle is decided (default: rout). */
  victory?: VictoryRule[];
  events?: ScenarioEvent[];
  /** Bonus objectives for whoever plays each side. */
  bonus: [Objective[], Objective[]];
  /** Fog of war (ambushes). */
  fog?: boolean;
  deploySeconds?: number;
  /** Play an existing scenario instead (Thermopylae), with the player's slot on each side. */
  scenario?: { id: string; slots: [string, string] };
}

/** A battle on a campaign's map. */
export interface CampaignNode {
  battle: string;
  side: number;
  /** Position on the path tree: column (left to right) and row (0 the main path, -1 above, 1 below). */
  col: number;
  row: number;
  /** Battles (ids) that open this one: any one of them won. Empty: open from the start. */
  after: string[];
  /** Glory for winning it. */
  glory: number;
  /** Troops it unlocks when won. */
  unlocks?: string[];
  /** A side battle: not needed to reach the end. */
  optional?: boolean;
}

/** A troop type in a campaign: free from the start, or unlocked with Glory once a battle is won. */
export interface RosterEntry {
  type: string;
  /** Glory to unlock (0: available from the start). */
  cost: number;
  /** Battle that must be won before it can be unlocked. */
  after?: string;
}

export interface CampaignDef {
  /** The country played. */
  faction: string;
  title: string;
  blurb: string;
  nodes: CampaignNode[];
  /** The army you start with (veteran mode), e.g. 'rome.hastati*3, rome.velites*2'. */
  start: string;
  roster: RosterEntry[];
  /** The last battle: winning it wins the campaign. */
  final: string;
}

export type Difficulty = 0 | 1 | 2 | 3;

export const DIFFICULTIES: { name: string; desc: string; enemy: number; strength: number; glory: number; startGlory: number; budget: number }[] = [
  {
    name: 'Easy',
    desc: 'Smaller enemy armies that fight a little worse and react slowly. More Glory to start with and bigger budgets.',
    enemy: 0.8,
    strength: 1,
    glory: 0.75,
    startGlory: 1500,
    budget: 1.25,
  },
  { name: 'Normal', desc: 'The armies history gave them, and an AI that fights like a sensible general.', enemy: 1, strength: 1, glory: 1, startGlory: 1000, budget: 1 },
  {
    name: 'Hard',
    desc: 'Enemy armies a fifth bigger, with an AI that thinks faster and men who fight harder. More Glory for each victory.',
    enemy: 1.2,
    strength: 1,
    glory: 1.25,
    startGlory: 800,
    budget: 0.9,
  },
  {
    name: 'Extreme',
    desc: 'Enemy armies two fifths bigger and tougher still, led by the sharpest AI. Half again the Glory. For veterans.',
    enemy: 1.4,
    strength: 1.15,
    glory: 1.5,
    startGlory: 600,
    budget: 0.8,
  },
];
