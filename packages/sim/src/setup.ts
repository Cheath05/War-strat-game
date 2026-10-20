// Builds the starting world from a battle setup: the scenario, the lobby's players and
// settings, and (in gold modes) the armies players recruited.

import { HP_SCALE, WORLD_VERSION, sec } from './constants';
import { TEAM_COLORS } from './data/colors';
import { faction, scenarioDef, unitType } from './data/registry';
import type { ArmySlotDef, DetDef, ZoneDef } from './data/types';
import { clamp, norm } from './math/det';
import { seedRng } from './math/rng';
import { buildMap, passableAt, type BattleMap } from './map/mapgen';
import { MOVE } from './map/terrain';
import type { Army, Detachment, MapRef, PlayerState, Settings, Soldier, Unit, World } from './types';
import { RANK } from './types';
import { defaultWidth, frontageOf, slotOffset } from './units/formation';

export interface PlayerSetup {
  id: number;
  name: string;
  role: 'general' | 'commander' | 'spectator';
  /** Army slot key. */
  slot: string;
  /** Detachment index within the army (commander role); 0 is the first non-guard detachment. */
  det: number;
}

export interface ArmySetup {
  slot: string;
  side: number;
  faction: string;
  name: string;
  title: string;
  dets: DetDef[];
  general?: string;
  deploy: string;
  ai: string;
  pal?: number;
}

export interface BattleSetup {
  seed: number;
  scenario: string;
  settings: Settings;
  map?: MapRef;
  players: PlayerSetup[];
  /** Replaces the scenario's armies for these slots (armies recruited with gold). */
  armies?: ArmySetup[];
  /** Starting gold per human player (gold modes). */
  gold?: number;
}

export function defaultSettings(): Settings {
  return { morale: true, fatigue: true, ammo: true, fog: false, unitSize: 1, difficulty: 1, timeLimit: 0, friendlyFire: false };
}

export function emptyOrder(): Unit['order'] {
  return { k: 'none', x: 0, y: 0, dx: 0, dy: 0, width: 0, target: 0, run: false, manual: false };
}

export function emptyDetOrder(): Detachment['order'] {
  return { k: 'none', x: 0, y: 0, t: 0, by: 0, at: 0 };
}

/** Army setups for every slot of the scenario, with recruited overrides applied. */
export function resolveArmies(setup: BattleSetup): ArmySetup[] {
  const sc = scenarioDef(setup.scenario);
  const out: ArmySetup[] = [];
  sc.sides.forEach((side, si) => {
    for (const slot of side.slots) {
      if (slot.reserve) continue;
      const over = setup.armies?.find((a) => a.slot === slot.key);
      out.push(over ?? fromSlot(slot, si));
    }
  });
  return out;
}

export function fromSlot(slot: ArmySlotDef, side: number): ArmySetup {
  return {
    slot: slot.key,
    side,
    faction: slot.faction,
    name: slot.name,
    title: slot.title,
    dets: slot.dets,
    general: slot.general,
    deploy: slot.deploy,
    ai: slot.ai,
    pal: slot.pal,
  };
}

export function createWorld(setup: BattleSetup): World {
  const sc = scenarioDef(setup.scenario);
  const mapRef: MapRef = setup.map ?? { id: sc.map.id, seed: sc.map.seed ?? (setup.seed & 0xffff), params: sc.map.params ?? {} };
  const map = buildMap(mapRef);
  const humans = setup.players.filter((p) => p.role !== 'spectator');
  const deploySeconds = humans.length ? (sc.deploySeconds ?? 45) : 0;
  const w: World = {
    v: WORLD_VERSION,
    tick: 0,
    phase: deploySeconds > 0 ? 'deploy' : 'battle',
    deployLeft: sec(deploySeconds),
    rng: seedRng(setup.seed),
    seed: setup.seed,
    settings: { ...setup.settings },
    map: mapRef,
    scenario: { id: sc.id, t: 0, fired: [], vars: {}, wave: 0, nextWave: 0 },
    sides: sc.sides.map((s, i) => ({ id: i, name: s.name, faction: s.faction, score: 0, out: false })),
    armies: [],
    dets: [],
    units: [],
    soldiers: [],
    proj: [],
    objectives: [],
    players: [],
    nextId: 1,
    result: null,
  };

  const armies = resolveArmies(setup);
  // Split shared deployment zones between the armies that use them.
  const zoneUse = new Map<string, string[]>();
  for (const a of armies) zoneUse.set(a.deploy, [...(zoneUse.get(a.deploy) ?? []), a.slot]);
  const usedColors = new Set<number>();
  for (const a of armies) {
    const zoneDef = map.zones[a.deploy];
    if (!zoneDef) throw new Error(`Map ${map.id} has no zone ${a.deploy}`);
    const sharers = zoneUse.get(a.deploy)!;
    const zone = subZone(zoneDef, sharers.indexOf(a.slot), sharers.length);
    spawnArmy(w, map, a, zone, pickColor(a, usedColors), setup.gold ?? 0);
  }

  for (const ps of setup.players) {
    const army = w.armies.find((a) => a.slot === ps.slot);
    const p: PlayerState = {
      id: ps.id,
      name: ps.name,
      role: ps.role,
      army: army?.id ?? 0,
      det: 0,
      on: true,
      poss: 0,
      mx: 0,
      my: 0,
      run: false,
      aimX: 0,
      aimY: 0,
      gold: setup.gold ?? 0,
      kills: 0,
      led: 0,
      ready: false,
    };
    if (army && ps.role === 'general') army.ctrl = ps.id;
    if (army && ps.role === 'commander') {
      const field = army.dets.map((id) => w.dets.find((d) => d.id === id)!).filter((d) => !d.guard);
      const d = field[clamp(ps.det, 0, field.length - 1)];
      if (d) {
        d.ctrl = ps.id;
        p.det = d.id;
      }
    }
    w.players.push(p);
  }
  return w;
}

function pickColor(a: ArmySetup, used: Set<number>): number {
  if (a.pal !== undefined && !used.has(a.pal)) {
    used.add(a.pal);
    return a.pal;
  }
  for (const c of faction(a.faction).colors) {
    if (!used.has(c)) {
      used.add(c);
      return c;
    }
  }
  for (let c = 0; c < TEAM_COLORS.length; c++) {
    if (!used.has(c)) {
      used.add(c);
      return c;
    }
  }
  return 0;
}

/**
 * A passable point on the map edge behind (cx, cy), searching sideways along the edge if
 * the spot straight behind is water or cliff.
 */
export function edgePoint(map: BattleMap, cx: number, cy: number, fx: number, fy: number, rx: number, ry: number): [number, number] {
  const far = Math.max(map.wm, map.hm);
  const bx = clamp(cx - fx * far, 1.5, map.wm - 1.5);
  const by = clamp(cy - fy * far, 1.5, map.hm - 1.5);
  for (let k = 0; k < 200; k++) {
    const off = (k % 2 === 0 ? 1 : -1) * Math.ceil(k / 2) * 2;
    const x = clamp(bx + rx * off, 1.5, map.wm - 1.5);
    const y = clamp(by + ry * off, 1.5, map.hm - 1.5);
    if (passableAt(map, x, y, MOVE.foot) && passableAt(map, x, y, MOVE.horse)) return [x, y];
  }
  return [bx, by];
}

/** Part k of n of a zone, split along its width (perpendicular to its facing). */
function subZone(z: ZoneDef, k: number, n: number): ZoneDef {
  if (n <= 1) return z;
  const alongX = Math.abs(z.dy) >= Math.abs(z.dx);
  if (alongX) {
    const step = (z.x1 - z.x0) / n;
    return { ...z, x0: z.x0 + step * k, x1: z.x0 + step * (k + 1) };
  }
  const step = (z.y1 - z.y0) / n;
  return { ...z, y0: z.y0 + step * k, y1: z.y0 + step * (k + 1) };
}

interface PlacedUnit {
  type: string;
  det: number;
  lateral: number;
  forward: number;
}

/** Creates an army with its general and detachments laid out in the zone. */
export function spawnArmy(w: World, map: BattleMap, a: ArmySetup, zone: ZoneDef, pal: number, gold: number): Army {
  const fac = faction(a.faction);
  const [fx, fy] = norm(zone.dx, zone.dy, 0, -1);
  const rx = -fy;
  const ry = fx;
  const cx = (zone.x0 + zone.x1) / 2;
  const cy = (zone.y0 + zone.y1) / 2;
  const zoneWidth = Math.abs(rx) * (zone.x1 - zone.x0) + Math.abs(ry) * (zone.y1 - zone.y0);
  const zoneDepth = Math.abs(fx) * (zone.x1 - zone.x0) + Math.abs(fy) * (zone.y1 - zone.y0);

  // Edge of the map behind the army: reinforcements arrive here, routers flee here.
  const [ex, ey] = edgePoint(map, cx, cy, fx, fy, rx, ry);

  const army: Army = {
    id: w.nextId++,
    side: a.side,
    slot: a.slot,
    name: a.name,
    title: a.title,
    faction: a.faction,
    pal,
    genUnit: 0,
    genSoldier: 0,
    ctrl: 0,
    dets: [],
    ai: { plan: '', stage: 0, roles: {}, since: 0 },
    directive: a.ai,
    zone: [zone.x0, zone.y0, zone.x1, zone.y1],
    edgeX: ex,
    edgeY: ey,
    shock: 0,
    genDead: false,
    kills: 0,
    losses: 0,
  };
  w.armies.push(army);

  const mkDet = (name: string, guard: boolean): Detachment => {
    const d: Detachment = {
      id: w.nextId++,
      army: army.id,
      side: a.side,
      name,
      units: [],
      cmdUnit: 0,
      ctrl: 0,
      order: emptyDetOrder(),
      stage: 0,
      guard,
    };
    w.dets.push(d);
    army.dets.push(d.id);
    return d;
  };

  // Lanes: infantry detachments in the centre, cavalry-heavy ones on the wings.
  const guardDet = mkDet(`${a.name}'s Guard`, true);
  const fieldDets = a.dets.map((dd) => ({ def: dd, det: mkDet(dd.name, false) }));
  const cavShare = (dd: DetDef): number => dd.units.filter((t) => unitType(t).mounted || unitType(t).cls === 'chariot').length / Math.max(1, dd.units.length);
  const centre = fieldDets.filter((x) => cavShare(x.def) < 0.5);
  const wings = fieldDets.filter((x) => cavShare(x.def) >= 0.5);
  const ordered = [...centre];
  wings.forEach((wd, i) => (i % 2 === 0 ? ordered.push(wd) : ordered.unshift(wd)));

  const GAP = 3;
  const sizeOf = (type: string): number => Math.max(1, Math.round(unitType(type).size * w.settings.unitSize));
  const frontage = (type: string): number => {
    const t = unitType(type);
    const n = sizeOf(type) - 1;
    return frontageOf(t, t.forms[0]!, defaultWidth(n, t)) + 2;
  };
  // Each detachment's lane is as wide as its widest row.
  const lanes = ordered.map(({ def, det }) => {
    const missile = def.units.filter((t) => isScreen(t));
    const main = def.units.filter((t) => !isScreen(t));
    const rowW = (row: string[]): number => row.reduce((s, t) => s + frontage(t), 0) + Math.max(0, row.length - 1) * GAP;
    return { def, det, missile, main, width: Math.max(rowW(missile), rowW(main), 4) };
  });
  let total = lanes.reduce((s, l) => s + l.width, 0) + Math.max(0, lanes.length - 1) * GAP * 2;
  // Two lines if one won't fit.
  const twoLines = total > zoneWidth && lanes.length > 1;
  const lines = twoLines ? [lanes.filter((_, i) => i % 2 === 0), lanes.filter((_, i) => i % 2 === 1)] : [lanes];
  const placed: PlacedUnit[] = [];
  const lineDepth = Math.min(30, zoneDepth / 3);
  lines.forEach((line, li) => {
    total = line.reduce((s, l) => s + l.width, 0) + Math.max(0, line.length - 1) * GAP * 2;
    let cursor = -total / 2;
    const fwd = twoLines ? (li === 0 ? lineDepth / 2 : -lineDepth / 2) : 0;
    for (const lane of line) {
      const place = (row: string[], forward: number): void => {
        const rowW = row.reduce((s, t) => s + frontage(t), 0) + Math.max(0, row.length - 1) * GAP;
        let c = cursor + (lane.width - rowW) / 2;
        for (const t of row) {
          const fw = frontage(t);
          placed.push({ type: t, det: lane.det.id, lateral: c + fw / 2, forward });
          c += fw + GAP;
        }
      };
      place(lane.missile, fwd + 9);
      place(lane.main, fwd);
      cursor += lane.width + GAP * 2;
    }
  });

  const genType = a.general ?? fac.general;
  placed.push({ type: genType, det: guardDet.id, lateral: 0, forward: (twoLines ? -lineDepth / 2 : 0) - 16 });

  for (const pu of placed) {
    const lx = clamp(cx + rx * pu.lateral + fx * pu.forward, zone.x0, zone.x1);
    const ly = clamp(cy + ry * pu.lateral + fy * pu.forward, zone.y0, zone.y1);
    const det = w.dets.find((d) => d.id === pu.det)!;
    const isGen = pu.det === guardDet.id;
    const u = spawnUnit(w, army, det, pu.type, lx, ly, fx, fy, sizeOf(pu.type));
    if (isGen) {
      army.genUnit = u.id;
      army.genSoldier = u.cap;
      w.soldiers.find((s) => s.id === u.cap)!.rank = RANK.general;
    }
  }
  for (const d of [guardDet, ...fieldDets.map((x) => x.det)]) {
    if (!d.units.length) continue;
    if (d.guard) {
      d.cmdUnit = d.units[0]!;
      continue;
    }
    // The commander leads the detachment's first main-line unit.
    const pick = d.units.find((id) => !isScreen(w.units.find((u) => u.id === id)!.type)) ?? d.units[0]!;
    d.cmdUnit = pick;
    const u = w.units.find((x) => x.id === pick)!;
    w.soldiers.find((s) => s.id === u.cap)!.rank = RANK.commander;
  }
  if (gold > 0) army.kills = 0;
  return army;
}

/** Missile and skirmish units stand in front of the main line at deployment. */
function isScreen(type: string): boolean {
  const t = unitType(type);
  return !t.mounted && (t.cls === 'skirm' || t.cls === 'archer' || t.cls === 'slinger');
}

/** Creates a unit in formation with its anchor at (x, y) facing (fx, fy). */
export function spawnUnit(w: World, army: Army, det: Detachment, type: string, x: number, y: number, fx: number, fy: number, n: number): Unit {
  const t = unitType(type);
  const form = t.forms[0]!;
  const u: Unit = {
    id: w.nextId++,
    type,
    army: army.id,
    det: det.id,
    side: army.side,
    sol: [],
    max: n,
    cap: 0,
    form,
    baseForm: form,
    width: defaultWidth(Math.max(1, n - 1), t),
    bw: defaultWidth(Math.max(1, n - 1), t),
    ax: x,
    ay: y,
    dx: fx,
    dy: fy,
    order: emptyOrder(),
    path: [],
    st: 'idle',
    morale: t.morale,
    fat: 0,
    ammo: t.missile ? t.missile.ammo : 0,
    flags: t.missile && !(t.cls === 'inf') ? 1 : 0,
    routs: 0,
    recentLoss: 0,
    losses: 0,
    hitT: -1000,
    chargeT: 0,
    volleyCd: 0,
    fireT: 0,
    kills: 0,
    possBy: 0,
    follow: 0,
    fLat: 0,
    fBack: 0,
    chargeAt: 0,
    cds: {},
    buff: 0,
    shock: 0,
    engaged: 0,
    flank: 0,
    enemyD: 1e9,
    calm: 0,
    born: w.tick,
  };
  const rx = -fy;
  const ry = fx;
  const nSlots = n - 1;
  // Officer first, then the ranks.
  const hp = t.hp * HP_SCALE;
  // Officers are a little tougher than their men.
  const officer: Soldier = makeSoldier(w, u, hp * 1.5, x + fx * 1.2, y + fy * 1.2, fx, fy, 0, RANK.captain);
  u.cap = officer.id;
  u.sol.push(officer.id);
  for (let k = 0; k < nSlots; k++) {
    const [lat, back] = slotOffset(u, t, k, nSlots, u.width);
    const s = makeSoldier(w, u, hp, x + rx * lat - fx * back, y + ry * lat - fy * back, fx, fy, k, RANK.soldier);
    u.sol.push(s.id);
  }
  w.units.push(u);
  det.units.push(u.id);
  return u;
}

function makeSoldier(w: World, u: Unit, hp: number, x: number, y: number, fx: number, fy: number, slot: number, rank: number): Soldier {
  const s: Soldier = { id: w.nextId++, u: u.id, x, y, vx: 0, vy: 0, fx, fy, hp, slot, rank, tgt: 0, cd: 0, act: 0, actK: 0, chg: 0 };
  w.soldiers.push(s);
  return s;
}
