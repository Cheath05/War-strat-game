// The Battle wraps a World (pure state) with caches rebuilt from it: the map, lookup
// tables, unit centres and the spatial grid. step() advances one tick in a fixed order.

import { HASH_EVERY } from './constants';
import { scenarioDef, unitType } from './data/registry';
import type { ScenarioDef, UnitTypeDef } from './data/types';
import type { SimEvent, Tone } from './events';
import { buildMap, type BattleMap } from './map/mapgen';
import { SpatialGrid } from './spatial';
import type { Army, Detachment, PlayerState, Soldier, Unit, World } from './types';
import { hashWorld } from './hash';
import { applyCommands, type TaggedCommand } from './commands';
import { runAI } from './ai';
import { processPaths, updateAnchors, steerSoldiers } from './units/movement';
import { updatePossession } from './roles/possession';
import { acquireTargets, resolveMelee } from './combat/melee';
import { resolveCharges } from './combat/charge';
import { updateBeasts } from './combat/beasts';
import { updateMissiles } from './combat/missiles';
import { updateMorale } from './morale/morale';
import { updateTimers } from './roles/abilities';
import { cleanup } from './units/lifecycle';
import { runScenario } from './scenario/runtime';
import { checkVictory } from './scenario/victory';
import { createWorld, type BattleSetup } from './setup';

export interface UnitCenter {
  x: number;
  y: number;
  n: number;
}

export class Battle {
  world: World;
  readonly map: BattleMap;
  readonly scenario: ScenarioDef;
  readonly grid: SpatialGrid;
  events: SimEvent[] = [];
  /** Hash of the last tick that was a multiple of HASH_EVERY. */
  lastHash = 0;
  lastHashTick = -1;

  private sol = new Map<number, Soldier>();
  private uni = new Map<number, Unit>();
  private det = new Map<number, Detachment>();
  private arm = new Map<number, Army>();
  private ply = new Map<number, PlayerState>();
  centers = new Map<number, UnitCenter>();

  constructor(world: World) {
    this.world = world;
    this.map = buildMap(world.map);
    this.scenario = scenarioDef(world.scenario.id, world.scenario.opts);
    this.grid = new SpatialGrid(this.map.wm, this.map.hm);
    this.reindex();
  }

  static create(setup: BattleSetup): Battle {
    return new Battle(createWorld(setup));
  }

  static load(json: string): Battle {
    return new Battle(JSON.parse(json) as World);
  }

  serialize(): string {
    return JSON.stringify(this.world);
  }

  hash(): number {
    return hashWorld(this.world);
  }

  /** Rebuilds every lookup table from the world. */
  reindex(): void {
    const w = this.world;
    this.sol.clear();
    this.uni.clear();
    this.det.clear();
    this.arm.clear();
    this.ply.clear();
    for (const s of w.soldiers) this.sol.set(s.id, s);
    for (const u of w.units) this.uni.set(u.id, u);
    for (const d of w.dets) this.det.set(d.id, d);
    for (const a of w.armies) this.arm.set(a.id, a);
    for (const p of w.players) this.ply.set(p.id, p);
    this.computeCenters();
  }

  soldier(id: number): Soldier | undefined {
    return id ? this.sol.get(id) : undefined;
  }
  unit(id: number): Unit | undefined {
    return id ? this.uni.get(id) : undefined;
  }
  detachment(id: number): Detachment | undefined {
    return id ? this.det.get(id) : undefined;
  }
  army(id: number): Army | undefined {
    return id ? this.arm.get(id) : undefined;
  }
  player(id: number): PlayerState | undefined {
    return id ? this.ply.get(id) : undefined;
  }
  typeOf(u: Unit): UnitTypeDef {
    return unitType(u.type);
  }
  center(u: Unit): UnitCenter {
    return this.centers.get(u.id) ?? { x: u.ax, y: u.ay, n: 0 };
  }

  /** Registers entities created mid-battle (reinforcements). */
  addSoldier(s: Soldier): void {
    this.world.soldiers.push(s);
    this.sol.set(s.id, s);
  }
  addUnit(u: Unit): void {
    this.world.units.push(u);
    this.uni.set(u.id, u);
  }
  addDetachment(d: Detachment): void {
    this.world.dets.push(d);
    this.det.set(d.id, d);
  }
  addArmy(a: Army): void {
    this.world.armies.push(a);
    this.arm.set(a.id, a);
  }
  addPlayer(p: PlayerState): void {
    this.world.players.push(p);
    this.ply.set(p.id, p);
  }
  forgetSoldier(id: number): void {
    this.sol.delete(id);
  }

  newId(): number {
    return this.world.nextId++;
  }

  emit(e: SimEvent): void {
    this.events.push(e);
  }

  /** A HUD message for everyone (side -1), one side, or one player (to). */
  msg(text: string, tone: Tone = 'info', side = -1, to = 0): void {
    this.events.push({ k: 'msg', text, tone, side, to });
  }

  /** Unit centres from current soldier positions (a cache rebuilt at the start of each tick). */
  computeCenters(): void {
    this.centers.clear();
    for (const u of this.world.units) {
      if (u.st === 'gone' || !u.sol.length) continue;
      let x = 0;
      let y = 0;
      let n = 0;
      for (const id of u.sol) {
        const s = this.sol.get(id);
        if (!s) continue;
        x += s.x;
        y += s.y;
        n++;
      }
      if (n) this.centers.set(u.id, { x: x / n, y: y / n, n });
    }
  }

  /** Advances the battle by one tick, applying the given commands first. */
  step(cmds: TaggedCommand[]): void {
    this.events = [];
    const w = this.world;
    if (w.phase === 'ended') {
      w.tick++;
      return;
    }
    this.computeCenters();
    applyCommands(this, cmds);
    if (w.phase === 'deploy') {
      w.deployLeft--;
      const humans = w.players.filter((p) => p.on && p.role !== 'spectator');
      if (w.deployLeft <= 0 || (humans.length > 0 && humans.every((p) => p.ready))) {
        w.phase = 'battle';
        w.deployLeft = 0;
        this.emit({ k: 'phase', phase: 'battle' });
      }
      w.tick++;
      this.finishTick();
      return;
    }
    runScenario(this);
    runAI(this);
    processPaths(this);
    updatePossession(this);
    updateAnchors(this);
    this.grid.rebuild(w.soldiers);
    acquireTargets(this);
    steerSoldiers(this);
    this.grid.rebuild(w.soldiers);
    resolveCharges(this);
    updateBeasts(this);
    resolveMelee(this);
    updateMissiles(this);
    updateMorale(this);
    updateTimers(this);
    cleanup(this);
    checkVictory(this);
    w.scenario.t++;
    w.tick++;
    this.finishTick();
  }

  private finishTick(): void {
    if (this.world.tick % HASH_EVERY === 0) {
      this.lastHash = this.hash();
      this.lastHashTick = this.world.tick;
    }
  }
}
