// Lookups for game content. Factions, scenarios and maps register here once at import.

import type { FactionDef, ScenarioDef, UnitTypeDef } from './types';
import { ROME } from './factions/rome';
import { GREECE } from './factions/greece';
import { PERSIA } from './factions/persia';
import { CARTHAGE } from './factions/carthage';
import { MACEDON } from './factions/macedon';
import { GAULS } from './factions/gauls';
import { SAMNITES } from './factions/samnites';
import { EPIRUS } from './factions/epirus';
import { SELEUCIDS } from './factions/seleucids';
import { GERMANS } from './factions/germans';
import { LYDIA } from './factions/lydia';
import { BABYLON } from './factions/babylon';
import { EGYPT } from './factions/egypt';
import { SCYTHIA } from './factions/scythia';
import { IBERIA } from './factions/iberia';
import { THRACE } from './factions/thrace';
import { ILLYRIA } from './factions/illyria';
import { INDIA } from './factions/india';

/** The five great powers first (each has a campaign), then the peoples they fought. */
export const FACTIONS: FactionDef[] = [ROME, GREECE, CARTHAGE, PERSIA, MACEDON, GAULS, SAMNITES, EPIRUS, SELEUCIDS, GERMANS, LYDIA, BABYLON, EGYPT, SCYTHIA, IBERIA, THRACE, ILLYRIA, INDIA];

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

const CONFIGURED = new Map<string, ScenarioDef>();

/** Every option of a scenario with a valid choice (defaults for missing or unknown ones). */
export function scenarioChoices(id: string, given: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const o of SCENARIOS.get(id)?.options ?? []) {
    const g = given[o.id];
    out[o.id] = g !== undefined && o.choices.some((c) => c.id === g) ? g : o.choices[0]!.id;
  }
  return out;
}

/** A scenario, configured with the lobby's choices if it has options. */
export function scenarioDef(id: string, choices?: Record<string, string>): ScenarioDef {
  const s = SCENARIOS.get(id);
  if (!s) throw new Error(`Unknown scenario: ${id}`);
  if (!s.configure) return s;
  const c = scenarioChoices(id, choices);
  const key = `${id}|${(s.options ?? []).map((o) => `${o.id}=${c[o.id]}`).join('&')}`;
  let d = CONFIGURED.get(key);
  if (!d) {
    d = { ...s.configure(c), id: s.id, options: s.options, configure: s.configure };
    CONFIGURED.set(key, d);
  }
  return d;
}

/** Gold a side's armies may spend before the battle in a gold mode (0 if none). */
export function budgetFor(sc: ScenarioDef, side: number): number {
  const r = sc.recruit;
  if (!r || (r.sides && !r.sides.includes(side))) return 0;
  return r.goldBySide?.[side] ?? r.gold;
}

export function listScenarios(): ScenarioDef[] {
  return [...SCENARIOS.values()];
}
