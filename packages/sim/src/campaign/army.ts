// Your campaign army between battles: each unit's strength and kills carry on, and become
// a battle army (with the upgrades bought) for the next fight; afterwards the survivors and
// their kills are read back from the battlefield.

import type { Battle } from '../battle';
import { fromSlot, slotSide, type ArmySetup } from '../setup';
import { groupBy } from '../economy/armies';
import { vetRank, type Upgrades } from '../economy/upgrades';
import { unitType } from '../data/registry';
import type { ScenarioDef } from '../data/types';

/** One unit of a campaign army. */
export interface RosterUnit {
  /** Stable id within the campaign. */
  id: string;
  type: string;
  /** Strength left, 0..1 of a full unit. */
  str: number;
  /** Enemies killed over the whole campaign. */
  kills: number;
}

/** A unit's veterancy rank from its campaign kills. */
export function rankOf(u: RosterUnit): number {
  return vetRank(u.kills, unitType(u.type).size);
}

/** The battle army for the player's slot, built from the campaign army and its upgrades. */
export function campaignArmy(sc: ScenarioDef, slot: string, units: RosterUnit[], upgrades: Upgrades): ArmySetup | null {
  const side = slotSide(sc, slot);
  const def = sc.sides[side]?.slots.find((s) => s.key === slot);
  if (!def || !units.length) return null;
  const dets = groupBy(units, (u) => u.type).map((g) => ({
    name: g.name,
    units: g.items.map((u) => u.type),
    str: g.items.map((u) => u.str),
    vet: g.items.map((u) => rankOf(u)),
    ref: g.items.map((u) => u.id),
  }));
  return { ...fromSlot(def, side), dets, upgrades };
}

/** How a campaign unit came out of a battle. */
export interface Survivor {
  /** Strength left, 0..1 of a full unit (men who fled the field come back to the standards). */
  str: number;
  /** Enemies it killed in this battle. */
  kills: number;
}

/** The campaign units of the army in `slot` after the battle, by roster id. */
export function readSurvivors(b: Battle, slot: string): Map<string, Survivor> {
  const out = new Map<string, Survivor>();
  const army = b.world.armies.find((a) => a.slot === slot);
  if (!army) return out;
  for (const u of b.world.units) {
    if (u.army !== army.id || !u.ref) continue;
    const full = Math.max(1, Math.round(unitType(u.type).size * b.world.settings.unitSize));
    // Everyone not killed: the living, and those who ran and rejoin after the battle.
    const left = Math.max(0, u.max - u.losses);
    out.set(u.ref, { str: Math.min(1, left / full), kills: u.kills });
  }
  return out;
}
