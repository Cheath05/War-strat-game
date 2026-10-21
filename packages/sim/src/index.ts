// Public API of the battle simulation.
import './data/maps';
import './data/scenarios';

export * from './constants';
export * from './types';
export * from './events';
export { Battle, type UnitCenter } from './battle';
export { createWorld, defaultSettings, recruitedArmy, resolveArmies, slotSide, type BattleSetup, type PlayerSetup, type ArmySetup } from './setup';
export { type Command, type TaggedCommand, controls, ORDER_NAMES } from './commands';
export { buildMap, heightAt, terrainAt, listMaps, type BattleMap, type MapScript } from './map/mapgen';
export { T, TERRAIN, MOVE } from './map/terrain';
export { findPath } from './map/pathfind';
export { FACTIONS, faction, unitType, scenarioDef, scenarioChoices, budgetFor, listScenarios, hasUnitType } from './data/registry';
export { armyCost, defaultArmy, groupDets, recruitable, roleOf, validArmy } from './economy/armies';
export { TEAM_COLORS, type TeamColor } from './data/colors';
export type * from './data/types';
export { FORM, slotOffset, spacing } from './units/formation';
export { slotPos, officerLead, moveMask } from './units/movement';
export { ABILITIES, abilitiesOf } from './roles/abilities';
export { computeMorale } from './morale/morale';
export { seedRng } from './math/rng';
export { hashWorld } from './hash';
