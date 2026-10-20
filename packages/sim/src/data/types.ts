// Definitions for game content. Units, factions, scenarios and maps are plain data, so
// adding one is a new file in src/data/ and never a change to the engine.

import type { FormationKind } from '../types';

export type UnitClass =
  | 'inf' // sword / general infantry
  | 'spear' // spear infantry, hoplites
  | 'pike' // sarissa phalanx
  | 'skirm' // javelin skirmishers
  | 'archer'
  | 'slinger'
  | 'cav' // light / medium cavalry
  | 'hcav' // heavy shock cavalry
  | 'hacav' // horse archers
  | 'ele' // war elephants
  | 'chariot';

export interface MissileDef {
  kind: 'arrow' | 'javelin' | 'stone' | 'pilum';
  /** Metres. */
  range: number;
  /** Volleys per soldier. */
  ammo: number;
  dmg: number;
  ap: number;
  /** Seconds between volleys. */
  reload: number;
  /** 0..1: higher is tighter. */
  acc: number;
  /** Can fire while moving (horse archers). */
  onMove?: boolean;
}

/**
 * How the client's paper-doll generator draws this unit. The sim never reads it; it lives
 * here so a unit is defined in one place.
 */
export interface SpriteSpec {
  body: 'light' | 'medium' | 'heavy' | 'robe';
  armor: 'none' | 'linen' | 'bronze' | 'mail' | 'scale' | 'leather' | 'quilted';
  helmet:
    | 'none'
    | 'corinthian'
    | 'attic'
    | 'montefortino'
    | 'phrygian'
    | 'boeotian'
    | 'pilos'
    | 'tiara'
    | 'cap'
    | 'wolfpelt'
    | 'turban'
    | 'crown'
    | 'hood'
    | 'chalcidian'
    | 'kausia'
    | 'headband';
  crest: 'none' | 'transverse' | 'long' | 'feathers' | 'plume';
  shield: 'none' | 'aspis' | 'scutum' | 'parma' | 'pelte' | 'thureos' | 'spara' | 'oval' | 'small';
  weapon: 'spear' | 'sword' | 'pike' | 'javelin' | 'bow' | 'sling' | 'axe' | 'lance' | 'falcata';
  /** Tunic colour: the army colour, natural linen, or dark. */
  cloth: 'team' | 'linen' | 'dark' | 'robe';
  cape?: 'team' | 'red' | 'none';
  beard?: boolean;
  skin?: 'light' | 'olive' | 'tan' | 'brown' | 'dark';
  mount?: 'horse' | 'darkhorse' | 'greyhorse' | 'elephant' | 'chariot';
  /** Shield device. */
  emblem?: 'none' | 'lambda' | 'eagle' | 'owl' | 'star' | 'sun' | 'boss' | 'crescent' | 'lion';
}

export interface UnitTypeDef {
  id: string;
  faction: string;
  name: string;
  desc: string;
  cls: UnitClass;
  /** Soldiers at Medium unit size. */
  size: number;
  /** Gold. */
  cost: number;
  hp: number;
  atk: number;
  def: number;
  /** 0..90: share of non-piercing damage blocked. */
  armor: number;
  /** 0..90: chance to block a missile from the front; also adds defence. */
  shield: number;
  dmg: number;
  ap: number;
  /** Seconds between melee attacks. */
  cd: number;
  /** Melee reach in metres. */
  reach: number;
  charge: number;
  /** Extra attack and damage against cavalry, elephants and chariots. */
  bonusLarge: number;
  /** Charge mass (infantry 1). */
  mass: number;
  /** Walking and running speed, m/s. */
  speed: number;
  run: number;
  morale: number;
  missile?: MissileDef;
  /** Allowed formations; the first is the default. */
  forms: FormationKind[];
  /** Body radius in metres. */
  radius: number;
  mounted?: boolean;
  large?: boolean;
  /** The general's bodyguard. */
  general?: boolean;
  /** Fear caused in nearby enemies. */
  terror?: number;
  abilities?: string[];
  sprite: SpriteSpec;
}

export interface FactionDef {
  id: string;
  name: string;
  adjective: string;
  desc: string;
  /** Preferred team colours, as indices into TEAM_COLORS, in slot order. */
  colors: number[];
  units: UnitTypeDef[];
  /** Unit type of the general's bodyguard. */
  general: string;
  generalNames: string[];
}

export interface DetDef {
  name: string;
  units: string[];
}

export interface ArmySlotDef {
  key: string;
  /** General's name. */
  name: string;
  title: string;
  faction: string;
  /** Deployment zone id from the map. */
  deploy: string;
  /** Unit type for the general's guard; defaults to the faction's. */
  general?: string;
  dets: DetDef[];
  /** AI directive (see ArmyAI). */
  ai: string;
  /** Joins later (scenario trigger), not at the start. */
  reserve?: boolean;
  /** Fixed colour index; defaults to the slot order. */
  pal?: number;
}

export interface ScenarioSideDef {
  name: string;
  faction: string;
  role: 'attacker' | 'defender' | 'neutral';
  slots: ArmySlotDef[];
}

export type VictoryRule =
  | { k: 'rout' }
  | { k: 'timer'; winner: number; seconds: number }
  | { k: 'zone'; zone: string; side: number; count: number }
  | { k: 'points'; target: number };

export interface ScenarioDef {
  id: string;
  name: string;
  year?: string;
  blurb: string;
  history?: string;
  mode: 'historical' | 'laststand' | 'objective' | 'test';
  /** Test-only scenarios don't appear in menus. */
  hidden?: boolean;
  map: { id: string; seed?: number; params?: Record<string, number> };
  sides: [ScenarioSideDef, ScenarioSideDef];
  victory: VictoryRule[];
  /** Seconds of deployment phase. */
  deploySeconds?: number;
  /** Players recruit their own armies with gold (Last Stand, Objective battles). */
  recruit?: { gold: number; maxUnits: number };
}

export interface ZoneDef {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Facing toward the enemy for deployment. */
  dx: number;
  dy: number;
}

export interface PropDef {
  kind: string;
  x: number;
  y: number;
  s: number;
  /** Variant / rotation seed for the renderer. */
  v: number;
}
