// The battle state. Everything here is plain JSON data: no classes, Maps or typed arrays,
// so a world can be hashed, saved and sent to a reconnecting player exactly as it is.

export type FormationKind = 'line' | 'loose' | 'phalanx' | 'testudo' | 'shieldwall' | 'wedge' | 'column';

export type UnitState = 'idle' | 'moving' | 'engaged' | 'routing' | 'rallying' | 'shattered' | 'gone';

/** Soldier rank: the officer a player can take command of. */
export const RANK = { soldier: 0, captain: 1, commander: 2, general: 3 } as const;

/** Unit flags (bitmask in Unit.flags). */
export const UF = {
  fireAtWill: 1,
  skirmish: 2,
  guard: 4,
  brace: 8,
  hold: 16,
  charging: 32,
  evading: 64,
  needPath: 128,
} as const;

/** Soldier action kinds (Soldier.actK). */
export const ACT = { none: 0, attack: 1, knocked: 2, hit: 3, shoot: 4, cheer: 5 } as const;

export interface UnitOrder {
  k: 'none' | 'move' | 'attack' | 'follow';
  x: number;
  y: number;
  /** Final facing for a move; (0, 0) keeps the marching direction. */
  dx: number;
  dy: number;
  /** Final frontage in files; 0 keeps the current one. */
  width: number;
  /** Target unit for an attack. */
  target: number;
  run: boolean;
  /** Given directly by a player, so the commander AI leaves the unit alone. */
  manual: boolean;
}

export interface Soldier {
  id: number;
  /** Unit id. */
  u: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Facing (unit vector). */
  fx: number;
  fy: number;
  hp: number;
  /** Formation slot index. */
  slot: number;
  /** 0 soldier, 1 captain, 2 commander, 3 general (see RANK). */
  rank: number;
  /** Enemy soldier id being fought, or 0. */
  tgt: number;
  /** Ticks until the next attack. */
  cd: number;
  /** Ticks left in the current action. */
  act: number;
  /** Current action kind (see ACT). */
  actK: number;
  /** Ticks of charge bonus left. */
  chg: number;
}

export interface Unit {
  id: number;
  type: string;
  army: number;
  det: number;
  side: number;
  /** Soldier ids in slot order. */
  sol: number[];
  /** Soldiers at full strength. */
  max: number;
  /** Officer soldier id (captain, commander or general), 0 if none left. */
  cap: number;
  form: FormationKind;
  /** The formation to return to after a forced column. */
  baseForm: FormationKind;
  /** Frontage in files. */
  width: number;
  /** Frontage the unit returns to after squeezing through a narrow gap. */
  bw: number;
  /** Anchor: centre of the front rank. */
  ax: number;
  ay: number;
  /** Formation facing (unit vector). */
  dx: number;
  dy: number;
  order: UnitOrder;
  /** Remaining path waypoints, flattened [x0, y0, x1, y1, ...]. */
  path: number[];
  st: UnitState;
  morale: number;
  /** Fatigue 0..100. */
  fat: number;
  /** Missile volleys left (per soldier). */
  ammo: number;
  /** UF bitmask. */
  flags: number;
  routs: number;
  /** Decaying count of recent casualties (morale). */
  recentLoss: number;
  losses: number;
  /** Tick the unit was last damaged. */
  hitT: number;
  /** Charge window ticks left. */
  chargeT: number;
  /** Ticks until the next missile volley. */
  volleyCd: number;
  /** Unit id currently being shot at. */
  fireT: number;
  kills: number;
  /** Player id taking command of this unit, 0 if none. */
  possBy: number;
  /** Unit this one keeps station on (a led commander's detachment), with its offset. */
  follow: number;
  fLat: number;
  fBack: number;
  /** Enemy unit a possessed unit was ordered to charge. */
  chargeAt: number;
  /** Ability cooldowns in ticks, by ability id. */
  cds: Record<string, number>;
  /** Inspire / shout bonus ticks left. */
  buff: number;
  /** Morale shock ticks left (captain lost, charged, general died nearby). */
  shock: number;
  /** Soldiers in melee contact last tick. */
  engaged: number;
  /** Flank (1) / rear (2) attack pressure last tick. */
  flank: number;
  /** Distance to the nearest enemy unit (refreshed by the captain AI). */
  enemyD: number;
  /** Ticks spent rallying / out of danger while routing. */
  calm: number;
  /** Tick this unit entered the battle. */
  born: number;
}

export interface DetOrder {
  k: 'none' | 'hold' | 'advance' | 'attack' | 'flankL' | 'flankR' | 'skirmish' | 'reserve' | 'guard' | 'retreat';
  x: number;
  y: number;
  /** Target unit id (attack), 0 otherwise. */
  t: number;
  /** Player id who gave it; 0 for the AI general. */
  by: number;
  at: number;
  /** Facing to hold (a scenario position); absent or 0,0: face the enemy. */
  fx?: number;
  fy?: number;
}

export interface Detachment {
  id: number;
  army: number;
  side: number;
  name: string;
  units: number[];
  /** Unit holding the commander. */
  cmdUnit: number;
  /** Human commander's player id, 0 when the general (or AI) runs it. */
  ctrl: number;
  order: DetOrder;
  /** Progress through a multi-step order (e.g. a flank march). */
  stage: number;
  /** True for the general's own guard detachment. */
  guard: boolean;
}

export interface ArmyAI {
  plan: string;
  stage: number;
  /** Fixed roles per detachment id, assigned once. */
  roles: Record<string, string>;
  since: number;
}

export interface Army {
  id: number;
  side: number;
  /** Lobby slot key. */
  slot: string;
  /** General's name, e.g. "Leonidas". */
  name: string;
  /** Army title, e.g. "The Spartans". */
  title: string;
  faction: string;
  /** Colour/palette index for team colours. */
  pal: number;
  genUnit: number;
  genSoldier: number;
  /** Human general's player id, 0 for AI. */
  ctrl: number;
  dets: number[];
  ai: ArmyAI;
  /** Scenario directive for the AI general ('assault', 'defend', 'zone:<id>', 'path:<id>'). */
  directive: string;
  /** Deployment zone [x0, y0, x1, y1] in metres. */
  zone: number[];
  /** The zone's facing [dx, dy] (a 'hold' army keeps facing this way). */
  face: number[];
  /** Where reinforcements arrive and routers flee: point on the map edge, facing inward. */
  edgeX: number;
  edgeY: number;
  /** Ticks of army-wide shock after the general falls. */
  shock: number;
  genDead: boolean;
  kills: number;
  losses: number;
}

export interface PlayerState {
  id: number;
  name: string;
  role: 'general' | 'commander' | 'spectator';
  /** Lobby slot key (armies that arrive later look their players up by it). */
  slot: string;
  /** Detachment index chosen in the lobby (commanders). */
  detIndex: number;
  army: number;
  det: number;
  on: boolean;
  /** Possessed soldier id, 0 if none. */
  poss: number;
  /** Avatar movement intent, each in -1..1. */
  mx: number;
  my: number;
  run: boolean;
  aimX: number;
  aimY: number;
  gold: number;
  kills: number;
  /** Ticks spent leading in person. */
  led: number;
  /** Ready to end deployment. */
  ready: boolean;
}

export interface Projectile {
  id: number;
  /** 0 arrow, 1 javelin, 2 stone, 3 pilum. */
  kind: number;
  side: number;
  army: number;
  unit: number;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  /** Intended soldier. */
  tgt: number;
  /** Ticks elapsed; negative means not released yet. */
  t: number;
  dur: number;
  dmg: number;
  ap: number;
  vsLarge: number;
}

export interface Objective {
  id: number;
  key: string;
  name: string;
  kind: 'point' | 'zone';
  x: number;
  y: number;
  r: number;
  /** Owning side, -1 neutral. */
  owner: number;
  /** Capture progress -100 (side 0) .. +100 (side 1). */
  prog: number;
}

export interface SideState {
  id: number;
  name: string;
  faction: string;
  /** Victory points, waves survived, soldiers through the pass: scenario-defined. */
  score: number;
  out: boolean;
}

export interface Settings {
  morale: boolean;
  fatigue: boolean;
  ammo: boolean;
  fog: boolean;
  /** Soldiers per unit multiplier: 0.5, 1, 1.5 or 2. */
  unitSize: number;
  /** 0 Easy, 1 Normal, 2 Hard, 3 Legendary. */
  difficulty: number;
  /** Seconds; 0 for none. */
  timeLimit: number;
  friendlyFire: boolean;
}

export interface ScenarioState {
  id: string;
  /** Lobby choices the scenario was configured with. */
  opts: Record<string, string>;
  /** Ticks since the battle phase began. */
  t: number;
  fired: string[];
  vars: Record<string, number>;
  wave: number;
  nextWave: number;
}

export interface BattleResult {
  winner: number;
  reason: string;
  tick: number;
}

export interface MapRef {
  id: string;
  seed: number;
  params: Record<string, number>;
}

export interface World {
  v: number;
  tick: number;
  phase: 'deploy' | 'battle' | 'ended';
  /** Ticks left in deployment. */
  deployLeft: number;
  rng: number[];
  seed: number;
  settings: Settings;
  map: MapRef;
  scenario: ScenarioState;
  sides: SideState[];
  armies: Army[];
  dets: Detachment[];
  units: Unit[];
  soldiers: Soldier[];
  proj: Projectile[];
  objectives: Objective[];
  players: PlayerState[];
  nextId: number;
  result: BattleResult | null;
}
