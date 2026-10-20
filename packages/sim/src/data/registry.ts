// Lookups for game content. Factions, scenarios and maps register here once at import.

import type { FactionDef, ScenarioDef, UnitTypeDef } from './types';
import { ROME } from './factions/rome';
import { GREECE } from './factions/greece';

export const FACTIONS: FactionDef[] = [ROME, GREECE];

const UNITS = new Map<string, UnitTypeDef>();
const FACTION_BY_ID = new Map<string, FactionDef>();

export function registerFaction(f: FactionDef): void {
  if (!FACTIONS.includes(f)) FACTIONS.push(f);
  FACTION_BY_ID.set(f.id, f);
  for (const u of f.units) UNITS.set(u.id, u);
}
for (const f of FACTIONS) registerFaction(f);

export function unitType(id: string): UnitTypeDef {
  const t = UNITS.get(id);
  if (!t) throw new Error(`Unknown unit type: ${id}`);
  return t;
}

export function hasUnitType(id: string): boolean {
  return UNITS.has(id);
}

export function faction(id: string): FactionDef {
  const f = FACTION_BY_ID.get(id);
  if (!f) throw new Error(`Unknown faction: ${id}`);
  return f;
}

const SCENARIOS = new Map<string, ScenarioDef>();

export function registerScenario(s: ScenarioDef): void {
  SCENARIOS.set(s.id, s);
}

export function scenarioDef(id: string): ScenarioDef {
  const s = SCENARIOS.get(id);
  if (!s) throw new Error(`Unknown scenario: ${id}`);
  return s;
}

export function listScenarios(): ScenarioDef[] {
  return [...SCENARIOS.values()];
}
