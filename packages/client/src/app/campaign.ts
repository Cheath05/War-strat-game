// Campaigns in the browser: each country's progress is saved here, and between battles this
// works out what's open, what things cost, the army a battle starts with and what a battle
// earned. The battles themselves are ordinary solo battles of the sim's 'campaign' scenario.

import {
  DIFFICULTIES,
  MAX_LEVEL,
  armyCost,
  battleDef,
  campaignArmy,
  campaignDef,
  defaultSettings,
  judge,
  objectiveText,
  parseUnits,
  rankOf,
  readSurvivors,
  scenarioDef,
  slotKey,
  unitType,
  type Battle,
  type BattleSetup,
  type CampaignDef,
  type CampaignNode,
  type RosterUnit,
  type Track,
  type UnitRole,
  type Upgrades,
} from '@pl/sim';

export type ArmyMode = 'veteran' | 'fresh';

export interface CampaignSave {
  v: 1;
  faction: string;
  difficulty: number;
  mode: ArmyMode;
  unitSize: number;
  glory: number;
  /** Battles won, with the bonus objectives met. */
  won: Record<string, boolean[]>;
  /** Troops unlocked with Glory (or by winning a battle); the free ones always are. */
  unlocked: string[];
  upgrades: Upgrades;
  /** The veteran army. */
  army: RosterUnit[];
  nextId: number;
  /** The final battle has been won. */
  done: boolean;
}

/** Most units a campaign army may have. */
export const MAX_ARMY = 20;
/** Glory for one more level of a track, by the level bought. */
export const LEVEL_COST = [300, 600, 1000];

const key = (faction: string): string => `pl.campaign.${faction}`;

export function loadCampaign(faction: string): CampaignSave | null {
  try {
    const raw = localStorage.getItem(key(faction));
    if (!raw) return null;
    const s = JSON.parse(raw) as CampaignSave;
    return s.v === 1 && s.faction === faction ? s : null;
  } catch {
    return null;
  }
}

export function saveCampaign(s: CampaignSave): void {
  try {
    localStorage.setItem(key(s.faction), JSON.stringify(s));
  } catch {
    // storage unavailable: progress lasts as long as the page
  }
}

export function newCampaign(faction: string, difficulty: number, mode: ArmyMode, unitSize: number): CampaignSave {
  const def = campaignDef(faction);
  const s: CampaignSave = {
    v: 1,
    faction,
    difficulty,
    mode,
    unitSize,
    glory: DIFFICULTIES[difficulty]!.startGlory,
    won: {},
    unlocked: [],
    upgrades: { line: [0, 0, 0], missile: [0, 0, 0], horse: [0, 0, 0] },
    army: [],
    nextId: 1,
    done: false,
  };
  for (const type of parseUnits(def.start)) s.army.push({ id: `u${s.nextId++}`, type, str: 1, kills: 0 });
  saveCampaign(s);
  return s;
}

export type NodeState = 'locked' | 'open' | 'won';

export function nodeState(s: CampaignSave, n: CampaignNode): NodeState {
  if (s.won[n.battle]) return 'won';
  return n.after.length === 0 || n.after.some((b) => s.won[b]) ? 'open' : 'locked';
}

/** Can this troop type be put in the army (free, unlocked, or given by a battle won)? */
export function available(s: CampaignSave, def: CampaignDef, type: string): boolean {
  if (s.unlocked.includes(type)) return true;
  return def.roster.some((r) => r.type === type && r.cost === 0);
}

/** Why a locked troop type can't be unlocked yet, or '' if it can be. */
export function unlockBlock(s: CampaignSave, def: CampaignDef, type: string): string {
  const r = def.roster.find((x) => x.type === type);
  if (!r) return 'Not in this campaign';
  if (r.after && !s.won[r.after]) return `Win ${battleDef(r.after).name} first`;
  if (s.glory < r.cost) return `Needs ${r.cost} Glory`;
  return '';
}

export function unlock(s: CampaignSave, def: CampaignDef, type: string): CampaignSave {
  const r = def.roster.find((x) => x.type === type);
  if (!r || available(s, def, type) || unlockBlock(s, def, type)) return s;
  return { ...s, glory: s.glory - r.cost, unlocked: [...s.unlocked, type] };
}

/** Glory to raise a new unit, and to bring a worn unit back to full strength. */
export const recruitCost = (type: string): number => Math.round(unitType(type).cost * 0.4);
export const refillCost = (u: RosterUnit): number => Math.round(unitType(u.type).cost * 0.35 * (1 - u.str));

export function recruit(s: CampaignSave, def: CampaignDef, type: string): CampaignSave {
  const c = recruitCost(type);
  if (!available(s, def, type) || s.glory < c || s.army.length >= MAX_ARMY) return s;
  return { ...s, glory: s.glory - c, army: [...s.army, { id: `u${s.nextId}`, type, str: 1, kills: 0 }], nextId: s.nextId + 1 };
}

export function refill(s: CampaignSave, id: string): CampaignSave {
  const u = s.army.find((x) => x.id === id);
  if (!u || u.str >= 1) return s;
  const c = refillCost(u);
  if (s.glory < c) return s;
  return { ...s, glory: s.glory - c, army: s.army.map((x) => (x.id === id ? { ...x, str: 1 } : x)) };
}

export function dismiss(s: CampaignSave, id: string): CampaignSave {
  return { ...s, army: s.army.filter((x) => x.id !== id) };
}

export function upgrade(s: CampaignSave, arm: UnitRole, track: number): CampaignSave {
  const level = s.upgrades[arm][track] ?? 0;
  const c = LEVEL_COST[level];
  if (level >= MAX_LEVEL || c === undefined || s.glory < c) return s;
  const levels = [...s.upgrades[arm]];
  levels[track] = level + 1;
  return { ...s, glory: s.glory - c, upgrades: { ...s.upgrades, [arm]: levels } };
}

export const TRACK_NAMES: Record<Track, string> = { weapons: 'Weapons', armour: 'Armour', drill: 'Drill' };
export const ARM_NAMES: Record<UnitRole, string> = { line: 'Infantry', missile: 'Missile troops', horse: 'Cavalry' };

/** The army history gave the player in this battle (fresh mode starts from it). */
export function historicalArmy(n: CampaignNode): string[] {
  return parseUnits(battleDef(n.battle).sides[n.side]!.armies[0]!.units);
}

/** Gold to build a fresh army for this battle: what history's army cost, by the difficulty. */
export function freshBudget(s: CampaignSave, n: CampaignNode): number {
  return Math.round(armyCost(historicalArmy(n)) * DIFFICULTIES[s.difficulty]!.budget);
}

/** The battle as it will be fought: setup, and the player's slot. */
export function battleSetup(s: CampaignSave, n: CampaignNode, freshUnits: string[] | null, playerName: string): { setup: BattleSetup; slot: string } {
  const b = battleDef(n.battle);
  const d = DIFFICULTIES[s.difficulty]!;
  const strength = [1, 1];
  strength[1 - n.side] = d.strength;
  const settings = { ...defaultSettings(), difficulty: s.difficulty, unitSize: s.unitSize, strength, fog: !!b.fog };
  const scenario = b.scenario ? b.scenario.id : 'campaign';
  const options = b.scenario ? undefined : { battle: n.battle, side: String(n.side), diff: String(s.difficulty) };
  const slot = b.scenario ? b.scenario.slots[n.side]! : slotKey(n.side, 0);
  const sc = scenarioDef(scenario, options);
  const units = s.mode === 'veteran' ? s.army : (freshUnits ?? historicalArmy(n)).map((type, i) => ({ id: `f${i}`, type, str: 1, kills: 0 }));
  const army = campaignArmy(sc, slot, units, s.upgrades);
  return {
    setup: {
      seed: Math.floor(Math.random() * 1e9),
      scenario,
      options,
      settings,
      armies: army ? [army] : undefined,
      players: [{ id: 1, name: playerName, role: 'general', slot, det: 0, host: true }],
    },
    slot,
  };
}

export interface Outcome {
  battle: string;
  won: boolean;
  objectives: { text: string; ok: boolean; glory: number }[];
  glory: number;
  /** Veteran mode: how each unit came out. */
  units: { name: string; type: string; before: number; after: number; rankBefore: number; rankAfter: number; lost: boolean }[];
  unlocked: string[];
  finished: boolean;
}

/**
 * What a finished battle earned: on a victory, Glory for the battle and each bonus objective
 * met, the survivors and their kills (veteran mode), any troops it unlocks. A defeat changes
 * nothing: the battle can be fought again.
 */
export function applyOutcome(s: CampaignSave, n: CampaignNode, b: Battle, slot: string): { save: CampaignSave; outcome: Outcome } {
  const def = campaignDef(s.faction);
  const battle = battleDef(n.battle);
  const won = b.world.result?.winner === n.side;
  const mult = DIFFICULTIES[s.difficulty]!.glory;
  const objectives = battle.bonus[n.side]!.map((o) => ({ text: objectiveText(o, battle, n.side), ok: judge(b, o, n.side, slot), glory: Math.round(o.glory * mult) }));
  const outcome: Outcome = { battle: n.battle, won, objectives, glory: 0, units: [], unlocked: [], finished: false };
  if (!won) return { save: s, outcome };
  outcome.glory = Math.round(n.glory * mult) + objectives.reduce((t, o) => t + (o.ok ? o.glory : 0), 0);
  let army = s.army;
  if (s.mode === 'veteran') {
    const back = readSurvivors(b, slot);
    army = [];
    for (const u of s.army) {
      const r = back.get(u.id);
      const next = r ? { ...u, str: r.str, kills: u.kills + r.kills } : u;
      const lost = next.str < 0.05;
      outcome.units.push({ name: unitType(u.type).name, type: u.type, before: u.str, after: lost ? 0 : next.str, rankBefore: rankOf(u), rankAfter: rankOf(next), lost });
      if (!lost) army.push(next);
    }
  }
  const unlocked = [...s.unlocked];
  for (const t of n.unlocks ?? []) {
    if (!unlocked.includes(t) && !available(s, def, t)) {
      unlocked.push(t);
      outcome.unlocked.push(t);
    }
  }
  outcome.finished = n.battle === def.final;
  const save: CampaignSave = { ...s, glory: s.glory + outcome.glory, won: { ...s.won, [n.battle]: objectives.map((o) => o.ok) }, army, unlocked, done: s.done || outcome.finished };
  return { save, outcome };
}
