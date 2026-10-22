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
/** Colours a sprite part can take instead of its usual one. */
export type Material = 'team' | 'team2' | 'bronze' | 'iron' | 'silver' | 'steel' | 'gold' | 'red' | 'black' | 'white' | 'purple' | 'linen' | 'leather';
export type TintPart = 'cloth' | 'armor' | 'helm' | 'crest' | 'shield' | 'emblem' | 'cape' | 'trim';

export interface SpriteSpec {
  body: 'light' | 'medium' | 'heavy' | 'robe';
  armor: 'none' | 'linen' | 'bronze' | 'mail' | 'scale' | 'leather' | 'quilted' | 'segmentata';
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
    | 'headband'
    | 'galea'
    | 'lionpelt'
    /** Egyptian striped headcloth. */
    | 'nemes'
    /** Pointed iron helmet (Babylon, Assyria, the steppe). */
    | 'conical';
  /** 'great': the tall, bushy horsehair crest of Sparta. */
  crest: 'none' | 'transverse' | 'long' | 'feathers' | 'plume' | 'great';
  shield: 'none' | 'aspis' | 'scutum' | 'parma' | 'pelte' | 'thureos' | 'spara' | 'oval' | 'small';
  /** rhomphaia: the Thracian two-handed curved blade on a long haft; khopesh: the Egyptian sickle-sword. */
  weapon: 'spear' | 'sword' | 'pike' | 'javelin' | 'bow' | 'sling' | 'axe' | 'lance' | 'falcata' | 'rhomphaia' | 'khopesh';
  /** Tunic colour: the army colour, natural linen, or dark; bare: no tunic at all (Gallic fanatics). */
  cloth: 'team' | 'linen' | 'dark' | 'robe' | 'bare';
  cape?: 'team' | 'red' | 'none';
  beard?: boolean;
  skin?: 'light' | 'olive' | 'tan' | 'brown' | 'dark';
  hair?: 'dark' | 'fair' | 'auburn' | 'grey';
  /** barded: a horse in scale armour (cataphracts). */
  mount?: 'horse' | 'darkhorse' | 'greyhorse' | 'barded' | 'camel' | 'elephant' | 'chariot';
  /** Shield device. */
  emblem?: 'none' | 'lambda' | 'eagle' | 'owl' | 'star' | 'sun' | 'boss' | 'crescent' | 'lion' | 'wings';
  /** Metal greaves on the shins. */
  greaves?: boolean;
  /** Part colours that replace the usual ones; 'trim' edges armour, helmet and shield in that colour. */
  tint?: Partial<Record<TintPart, Material>>;
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
  /**
   * A super unit: the faction's champions. Recruited on purpose (never in a balanced army),
   * they lead the last waves of Last Stand and are drawn larger, with gold on their banner.
   */
  elite?: boolean;
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
  /** Campaign armies, by unit index: strength left (0..1 of full), veterancy rank, roster id. */
  str?: number[];
  vet?: number[];
  ref?: string[];
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
  /** Seconds into the battle a reserve army marches on (campaign battles; others script it). */
  arrive?: number;
  /** Fixed colour index; defaults to the slot order. */
  pal?: number;
}

export interface ScenarioSideDef {
  name: string;
  faction: string;
  role: 'attacker' | 'defender' | 'neutral';
  slots: ArmySlotDef[];
  /** Only the AI plays this side (Last Stand's waves). */
  aiOnly?: boolean;
}

/** A lobby choice that changes the battle (map, factions...). The first choice is the default. */
export interface ScenarioOption {
  id: string;
  name: string;
  /** What the choice changes, shown in the lobby. */
  desc?: string;
  /** Each choice may say what it's like too (shown when it's picked). */
  choices: { id: string; name: string; desc?: string }[];
  /** The faction of one army slot (sandbox): chosen on that army in the lobby, not with the rest. */
  slot?: string;
}

export type VictoryRule =
  | { k: 'rout' }
  | { k: 'timer'; winner: number; seconds: number }
  | { k: 'zone'; zone: string; side: number; count: number }
  | { k: 'points'; target: number }
  /** At the deadline, the side with more victory points wins. */
  | { k: 'deadline'; seconds: number }
  /** The side loses when the general of its first army (or of the army in slot) falls. */
  | { k: 'general'; side: number; slot?: string };

/** A message at a moment of a scripted battle, for one side (or -1: everyone). */
export interface ScenarioEvent {
  /** Seconds into the battle. */
  at: number;
  side: number;
  text: string;
  tone?: 'info' | 'good' | 'bad' | 'epic';
}

export interface ScenarioDef {
  id: string;
  name: string;
  year?: string;
  blurb: string;
  history?: string;
  mode: 'historical' | 'laststand' | 'objective' | 'sandbox' | 'test';
  /** Test-only scenarios don't appear in menus. */
  hidden?: boolean;
  map: { id: string; seed?: number; params?: Record<string, number> };
  sides: [ScenarioSideDef, ScenarioSideDef];
  victory: VictoryRule[];
  /** Seconds of deployment phase. */
  deploySeconds?: number;
  /**
   * Gold: players recruit their own armies before the battle (gold > 0) and/or buy
   * reinforcements during it. `sides` limits it to some sides (default all); `income` is
   * gold per minute per human player.
   */
  recruit?: { gold: number; maxUnits: number; sides?: number[]; income?: number; goldBySide?: number[] };
  /**
   * Sandbox: every army is put together freely, from any faction's units, up to maxUnits each
   * and at no cost; there is no gold in the battle.
   */
  sandbox?: { maxUnits: number };
  /** Lobby choices; `configure` builds the battle from the chosen ones. */
  options?: ScenarioOption[];
  configure?: (choices: Record<string, string>) => ScenarioDef;
  /** Capture points at named map points. */
  objectives?: { at: string; name: string; r: number }[];
  /** Scripted enemy waves (Last Stand): where they come from and how many. */
  waves?: { zones: string[]; count: number };
  /** Timed messages (campaign battles). */
  events?: ScenarioEvent[];
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
