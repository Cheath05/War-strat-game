// A running battle on this computer: the lockstep driver advancing the simulation, the
// renderer drawing it, the input turning clicks into commands, and the HUD snapshot that
// React shows. Solo games get their turns from a local clock; multiplayer from the relay.

import { Battle, TICK_HZ, TICKS_PER_TURN, controls, type Command, type PlayerState, type SimEvent, type TaggedCommand, type Unit } from '@pl/sim';
import { LockstepDriver } from '@pl/net';
import { createStore, type Store } from '../app/store';
import { BattleRenderer } from './render/BattleRenderer';
import { BattleInput } from './input/input';
import { buildHud, emptyHud, type HudState, type HudMessage } from './hud';
import type { GraphicsSettings } from './render/quality';

/** Supplies turns in a solo game: every 100 ms it releases the commands issued since. */
export class LocalTurnClock {
  private pending: TaggedCommand[] = [];
  private acc = 0;
  private next: number;
  paused = false;

  constructor(
    private driver: LockstepDriver,
    private playerId: number,
  ) {
    this.next = Math.floor(driver.battle.world.tick / TICKS_PER_TURN);
  }

  push(cmd: Command): void {
    this.pending.push({ p: this.playerId, c: cmd });
  }

  update(dtMs: number): void {
    if (this.paused) return;
    this.acc += Math.min(dtMs, 250);
    const turnMs = (TICKS_PER_TURN * 1000) / TICK_HZ;
    while (this.acc >= turnMs) {
      this.acc -= turnMs;
      this.driver.receiveTurn(this.next++, this.pending.splice(0));
    }
  }
}

export interface SessionOptions {
  playerId: number;
  graphics: GraphicsSettings;
  /** Multiplayer: send a command to the relay. Solo when absent. */
  send?: (cmd: Command) => void;
  /** Multiplayer: report a hash to the relay. */
  hash?: (tick: number, hash: number) => void;
  onEvents?: (events: SimEvent[], b: Battle) => void;
}

export class GameSession {
  readonly driver: LockstepDriver;
  readonly hud: Store<HudState>;
  renderer: BattleRenderer | null = null;
  input: BattleInput | null = null;
  clock: LocalTurnClock | null = null;
  private raf = 0;
  private last = 0;
  private hudTimer = 0;
  private messages: HudMessage[] = [];
  private fpsFrames = 0;
  private fpsTime = 0;
  fps = 0;
  private stopped = false;

  constructor(
    battle: Battle,
    readonly opts: SessionOptions,
  ) {
    this.hud = createStore<HudState>(emptyHud());
    this.driver = new LockstepDriver(battle, {
      send: (cmd) => (opts.send ? opts.send(cmd) : this.clock?.push(cmd)),
      hash: opts.hash,
      beforeTick: (b) => this.renderer?.beforeTick(b),
      afterTick: (b) => this.afterTick(b),
    });
    if (!opts.send) this.clock = new LocalTurnClock(this.driver, opts.playerId);
  }

  get battle(): Battle {
    return this.driver.battle;
  }

  get me(): PlayerState | undefined {
    return this.battle.player(this.opts.playerId);
  }

  /** Can this player give orders to the unit? */
  mine(u: Unit): boolean {
    const p = this.me;
    return !!p && controls(this.battle, p, u);
  }

  issue(cmd: Command): void {
    this.driver.issue(cmd);
  }

  mount(container: HTMLElement): void {
    const r = new BattleRenderer(container, this.battle, this.opts.graphics);
    this.renderer = r;
    // Dev-only handle for debugging in the browser console.
    if (import.meta.env.DEV) (window as unknown as { __pl: GameSession }).__pl = this;
    r.mine = (u) => this.mine(u);
    this.input = new BattleInput(this, r, container);
    // Start the camera over our own army, looking toward the enemy.
    const me = this.me;
    const army = me ? this.battle.army(me.army) : this.battle.world.armies[0];
    if (army) {
      const zx = (army.zone[0]! + army.zone[2]!) / 2;
      const zy = (army.zone[1]! + army.zone[3]!) / 2;
      const fx = (this.battle.map.wm / 2 - zx) || 0.001;
      const fy = (this.battle.map.hm / 2 - zy) || 0.001;
      const yaw = Math.atan2(-fx, -fy);
      r.rig.startIntro(zx, zy, yaw);
    }
    this.last = performance.now();
    const loop = (t: number): void => {
      if (this.stopped) return;
      this.raf = requestAnimationFrame(loop);
      this.frame(t);
    };
    this.raf = requestAnimationFrame(loop);
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => this.renderer?.resize();

  private frame(t: number): void {
    const dt = Math.min(0.25, (t - this.last) / 1000);
    this.last = t;
    this.clock?.update(dt * 1000);
    this.driver.update(dt * 1000);
    if (this.renderer && this.renderer.battle !== this.driver.battle) this.renderer.setBattle(this.driver.battle);
    if (this.renderer) {
      const me = this.me;
      const army = me && this.battle.world.phase === 'deploy' ? this.battle.army(me.army) : undefined;
      this.renderer.zone = army ? army.zone : null;
    }
    this.input?.update(dt);
    this.renderer?.render(dt, this.driver.alpha);
    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
    this.hudTimer += dt;
    if (this.hudTimer >= 0.1) {
      this.hudTimer = 0;
      this.hud.set(buildHud(this));
    }
  }

  private afterTick(b: Battle): void {
    this.renderer?.afterTick(b);
    const me = this.opts.playerId;
    for (const e of b.events) {
      if (e.k !== 'msg') continue;
      if (e.to && e.to !== me) continue;
      const mySide = this.me ? (b.army(this.me.army)?.side ?? -1) : -1;
      if (e.side >= 0 && e.side !== mySide) continue;
      this.messages.push({ id: b.world.tick * 100 + this.messages.length, text: e.text, tone: e.tone, at: performance.now() });
    }
    if (this.messages.length > 30) this.messages.splice(0, this.messages.length - 30);
    this.opts.onEvents?.(b.events, b);
  }

  recentMessages(): HudMessage[] {
    const now = performance.now();
    return this.messages.filter((m) => now - m.at < 9000).slice(-6);
  }

  setPaused(p: boolean): void {
    if (this.clock) this.clock.paused = p;
  }

  stop(): void {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.input?.dispose();
    this.renderer?.dispose();
    this.renderer = null;
  }
}
