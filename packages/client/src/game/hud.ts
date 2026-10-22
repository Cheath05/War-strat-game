// The HUD snapshot: what React shows about the battle, rebuilt ten times a second from
// the world (React never reads the simulation directly).

import { ABILITIES, ORDER_NAMES, TEAM_COLORS, TICK_HZ, abilitiesOf, aiArmy, strengthOf, type Battle, type Tone, type Unit } from '@pl/sim';
import type { GameSession } from './session';

export interface HudMessage {
  id: number;
  text: string;
  tone: Tone;
  at: number;
}

export interface UnitCard {
  id: number;
  type: string;
  name: string;
  cls: string;
  n: number;
  max: number;
  morale: 'steady' | 'wavering' | 'routing' | 'shattered' | 'rallying';
  fat: number;
  ammo: number;
  maxAmmo: number;
  form: string;
  forms: string[];
  selected: boolean;
  led: boolean;
  engaged: boolean;
  order: string;
  officer: number;
  rank: number;
  group: number;
  abilities: { id: string; name: string; cd: number; ready: boolean }[];
  flags: number;
  run: boolean;
}

export interface DetCard {
  id: number;
  name: string;
  order: string;
  commander: string;
  mine: boolean;
  guard: boolean;
  human: boolean;
  units: UnitCard[];
}

/** An AI-led army on our side that our general can give a plan. */
export interface AllyCard {
  id: number;
  name: string;
  title: string;
  /** What it's doing: the plan we asked for, or its own. */
  plan: string;
  cmd: string;
}

const ALLY_PLANS: Record<string, string> = { assault: 'Attacking', defend: 'Defending', hold: 'Holding' };

export interface SideInfo {
  name: string;
  color: string;
  alive: number;
  start: number;
  score: number;
}

export interface HudState {
  ok: boolean;
  title: string;
  phase: 'deploy' | 'battle' | 'ended';
  deployLeft: number;
  time: number;
  result: { winner: number; reason: string; mine: boolean } | null;
  sides: SideInfo[];
  mySide: number;
  armyName: string;
  role: string;
  gold: number;
  ready: boolean;
  /** The AI is leading this player's troops (they handed them over). */
  auto: boolean;
  dets: DetCard[];
  allies: AllyCard[];
  selected: number[];
  messages: HudMessage[];
  possessed: { unit: number; name: string; hp: number; maxHp: number; hold: boolean } | null;
  paused: boolean;
  pausedBy: string;
  multiplayer: boolean;
  fps: number;
  backlog: number;
  orderMode: string;
  /** For a commander: the order their General last gave them. */
  myOrder: { text: string; from: string } | null;
  /** Shown while the player's army (a reserve slot) hasn't arrived yet. */
  waiting: string | null;
  /** Per side: victory points or waves, when the battle keeps score. */
  notes: string[];
  /** Gold buys reinforcements for us in this battle. */
  goldMode: boolean;
  /** Our army can't take more units. */
  armyFull: boolean;
  faction: string;
  pal: number;
}

export function emptyHud(): HudState {
  return {
    ok: false,
    title: '',
    phase: 'deploy',
    deployLeft: 0,
    time: 0,
    result: null,
    sides: [],
    mySide: 0,
    armyName: '',
    waiting: null,
    notes: [],
    goldMode: false,
    armyFull: false,
    faction: '',
    pal: 0,
    role: '',
    gold: 0,
    ready: false,
    auto: false,
    dets: [],
    allies: [],
    selected: [],
    messages: [],
    possessed: null,
    paused: false,
    pausedBy: '',
    multiplayer: false,
    fps: 0,
    backlog: 0,
    orderMode: '',
    myOrder: null,
  };
}

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

function moraleOf(u: Unit): UnitCard['morale'] {
  if (u.st === 'shattered') return 'shattered';
  if (u.st === 'routing') return 'routing';
  if (u.st === 'rallying') return 'rallying';
  return u.morale < 20 ? 'wavering' : 'steady';
}

function orderText(b: Battle, u: Unit): string {
  if (u.possBy) return 'Led in person';
  switch (u.order.k) {
    case 'move':
      return u.order.run ? 'Running' : 'Marching';
    case 'attack':
      return `Attacking ${b.unit(u.order.target) ? b.typeOf(b.unit(u.order.target)!).name : ''}`;
    case 'follow':
      return 'Following';
    default:
      return u.engaged ? 'Fighting' : u.st === 'idle' ? 'Holding' : u.st;
  }
}

export function card(b: Battle, u: Unit, s: GameSession): UnitCard {
  const t = b.typeOf(u);
  const r = s.renderer;
  const off = b.soldier(u.cap);
  return {
    id: u.id,
    type: u.type,
    name: t.name,
    cls: t.cls,
    n: u.sol.length,
    max: u.max,
    morale: moraleOf(u),
    fat: Math.round(u.fat),
    ammo: t.missile ? (b.world.settings.ammo ? u.ammo : t.missile.ammo) : 0,
    maxAmmo: t.missile?.ammo ?? 0,
    form: u.form,
    forms: t.forms,
    selected: !!r?.selected.has(u.id),
    led: u.possBy !== 0,
    engaged: u.engaged > 0,
    order: orderText(b, u),
    officer: u.cap,
    rank: off?.rank ?? 0,
    group: r?.groups.get(u.id) ?? 0,
    abilities: abilitiesOf(b, u).map((id) => ({ id, name: ABILITIES[id]?.name ?? id, cd: Math.ceil((u.cds[id] ?? 0) / TICK_HZ), ready: (u.cds[id] ?? 0) <= 0 })),
    flags: u.flags,
    run: u.order.run,
  };
}

export function buildHud(s: GameSession): HudState {
  const b = s.battle;
  const w = b.world;
  const me = s.me;
  const myArmy = me ? b.army(me.army) : undefined;
  const mySide = Math.max(0, s.mySide);
  // A reserve slot: the army arrives later in the battle.
  const waitingFor = me && !myArmy && me.role !== 'spectator' ? b.scenario.sides[mySide]?.slots.find((sl) => sl.key === me.slot) : undefined;
  const sides: SideInfo[] = w.sides.map((sd, i) => {
    let alive = 0;
    let start = 0;
    for (const u of w.units) {
      if (u.side !== i) continue;
      start += u.max;
      if (u.st !== 'gone' && u.st !== 'shattered') alive += u.sol.length;
    }
    const army = w.armies.find((a) => a.side === i);
    return { name: sd.name, color: army ? hex(TEAM_COLORS[army.pal]!.primary) : '#888', alive, start, score: sd.score };
  });
  const dets: DetCard[] = [];
  if (me) {
    for (const d of w.dets) {
      if (d.army !== me.army) continue;
      if (me.role === 'commander' && d.id !== me.det) continue;
      const units = d.units.map((id) => b.unit(id)).filter((u): u is Unit => !!u && u.st !== 'gone');
      if (!units.length) continue;
      const human = d.ctrl ? b.player(d.ctrl) : undefined;
      const mine = units.some((u) => s.mine(u));
      dets.push({
        id: d.id,
        name: d.name,
        order: d.order.k,
        commander: human ? human.name : d.guard ? (myArmy?.name ?? '') : 'AI commander',
        mine,
        guard: d.guard,
        human: !!human,
        units: units.map((u) => card(b, u, s)),
      });
    }
  }
  // Victory points (Capture & Hold) or waves (Last Stand).
  const sc = b.scenario;
  const pts = sc.victory.find((r) => r.k === 'points');
  const notes = w.sides.map((sd, i) => {
    if (sc.waves) return i === 0 ? `wave ${w.scenario.wave}/${sc.waves.count}, ${sd.score} beaten` : '';
    if (pts?.k === 'points') return `${sd.score}/${pts.target} pts`;
    return '';
  });
  const rec = sc.recruit;
  const goldMode = !!rec && !!myArmy && me?.role !== 'spectator' && (!rec.sides || rec.sides.includes(myArmy.side));
  const armyFull = !!rec && !!myArmy && w.units.filter((u) => u.army === myArmy.id && u.st !== 'gone').length >= rec.maxUnits;
  let possessed: HudState['possessed'] = null;
  if (me?.poss) {
    const so = b.soldier(me.poss);
    const u = so ? b.unit(so.u) : undefined;
    if (so && u) possessed = { unit: u.id, name: `${b.typeOf(u).name} ${so.rank === 3 ? 'general' : so.rank === 2 ? 'commander' : 'captain'}`, hp: so.hp, maxHp: b.typeOf(u).hp * 2.5 * 1.5 * strengthOf(w.settings, u.side), hold: (u.flags & 16) !== 0 };
  }
  return {
    ok: true,
    title: b.scenario.name,
    phase: w.phase,
    deployLeft: Math.ceil(w.deployLeft / TICK_HZ),
    time: Math.floor(w.scenario.t / TICK_HZ),
    result: w.result ? { winner: w.result.winner, reason: w.result.reason, mine: w.result.winner === mySide } : null,
    sides,
    mySide,
    armyName: myArmy ? `${myArmy.name}: ${myArmy.title}` : waitingFor ? `${waitingFor.name}: ${waitingFor.title}` : 'Spectating',
    notes,
    goldMode,
    armyFull,
    faction: myArmy?.faction ?? '',
    pal: myArmy?.pal ?? 0,
    waiting: waitingFor ? `${waitingFor.name} and ${waitingFor.title} arrive later in the battle. Watch the field until then.` : null,
    role: me?.role ?? 'spectator',
    gold: Math.floor(me?.gold ?? 0),
    ready: !!me?.ready,
    auto: !!me?.auto,
    dets,
    allies: me?.role === 'general' && myArmy ? allyCards(b, myArmy.id, myArmy.side) : [],
    selected: [...(s.renderer?.selected ?? [])],
    messages: s.recentMessages(),
    possessed,
    paused: !!s.clock?.paused || s.remotePaused,
    pausedBy: s.pausedBy,
    multiplayer: s.multiplayer,
    fps: s.fps,
    backlog: s.driver.backlog,
    orderMode: s.input?.orderMode ?? '',
    myOrder: commanderOrder(s),
  };
}

function allyCards(b: Battle, mine: number, side: number): AllyCard[] {
  const out: AllyCard[] = [];
  for (const a of b.world.armies) {
    if (a.id === mine || a.side !== side || !aiArmy(b, a)) continue;
    if (!b.world.units.some((u) => u.army === a.id && u.st !== 'gone')) continue;
    out.push({ id: a.id, name: a.name, title: a.title, plan: ALLY_PLANS[a.ai.cmd] ?? 'Own plan', cmd: a.ai.cmd });
  }
  return out;
}

function commanderOrder(s: GameSession): HudState['myOrder'] {
  const me = s.me;
  if (!me || me.role !== 'commander') return null;
  const d = s.battle.detachment(me.det);
  if (!d || d.order.k === 'none') return null;
  const army = s.battle.army(d.army);
  const from = d.order.by ? (s.battle.player(d.order.by)?.name ?? 'Your general') : (army?.name ?? 'Your general');
  const target = d.order.t ? s.battle.unit(d.order.t) : undefined;
  return { text: `${ORDER_NAMES[d.order.k]}${target ? `: ${s.battle.typeOf(target).name}` : ''}`, from };
}
