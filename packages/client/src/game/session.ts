// A running battle on this computer: the lockstep driver advancing the simulation, the
// renderer drawing it, the input turning clicks into commands, and the HUD snapshot that
// React shows. Solo games get their turns from a local clock; multiplayer from the relay.

import { Battle, TICK_HZ, TICKS_PER_TURN, controls, type Command, type PlayerState, type SimEvent, type TaggedCommand, type Unit } from '@pl/sim';
import { FogOfWar } from './fog';
import { music } from '../audio/music';
import { BattleSounds, ui } from '../audio/sfx';
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
  /** Multiplayer: answer the relay's request for our battle state. */
  sendState?: (req: number, tick: number, data: string) => void;
  /** Multiplayer: ask the relay to pause or resume for everyone. */
  pause?: (on: boolean) => void;
  /** Multiplayer: show a map ping to everyone. */
  ping?: (x: number, y: number) => void;
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
  private stateReq = 0;
  /** Army id we commanded last tick (0 while a reserve army is still on its way). */
  private lastArmy = 0;
  private fog: FogOfWar | null = null;
  private fogTimer = 0;
  private sounds = new BattleSounds();
  /** Paused by the relay (multiplayer), and by whom. */
  remotePaused = false;
  pausedBy = '';
  /** Recent world hashes by tick (for checking two computers agree while debugging). */
  readonly hashLog = new Map<number, number>();

  constructor(
    battle: Battle,
    readonly opts: SessionOptions,
  ) {
    this.hud = createStore<HudState>(emptyHud());
    this.driver = new LockstepDriver(battle, {
      send: (cmd) => (opts.send ? opts.send(cmd) : this.clock?.push(cmd)),
      hash: (tick, h) => {
        this.hashLog.set(tick, h);
        if (this.hashLog.size > 120) this.hashLog.delete(this.hashLog.keys().next().value!);
        opts.hash?.(tick, h);
      },
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
    if (cmd.k === 'move' || cmd.k === 'attack' || cmd.k === 'det') ui('order');
  }

  mount(container: HTMLElement): void {
    // Re-mounting (e.g. after a hot reload in development) starts from a clean view.
    if (this.renderer) {
      this.input?.dispose();
      this.renderer.dispose();
      this.renderer = null;
    }
    this.stopped = false;
    const r = new BattleRenderer(container, this.battle, this.opts.graphics);
    this.renderer = r;
    music.play(this.battle.world.phase === 'ended' ? 'victory' : 'battle');
    // Dev-only handle for debugging in the browser console.
    if (import.meta.env.DEV) (window as unknown as { __pl: GameSession }).__pl = this;
    r.mine = (u) => this.mine(u);
    r.visible = (u) => !this.fog || this.mySide < 0 || this.fog.visible(u, this.mySide);
    r.orderMarkers = () => this.orderMarkers();
    this.input = new BattleInput(this, r, container);
    // Start the camera over our own army (or our side, if ours arrives later), looking toward the enemy.
    const me = this.me;
    this.lastArmy = me?.army ?? 0;
    const army = me ? (this.battle.army(me.army) ?? this.battle.world.armies.find((a) => a.side === this.mySide)) : this.battle.world.armies[0];
    if (army) {
      let zx = (army.zone[0]! + army.zone[2]!) / 2;
      let zy = (army.zone[1]! + army.zone[3]!) / 2;
      // A commander starts over their own detachment.
      const d = me?.role === 'commander' ? this.battle.detachment(me.det) : undefined;
      const du = d ? this.battle.unit(d.units[0]!) : undefined;
      if (du) {
        zx = du.ax;
        zy = du.ay;
      }
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
    if (this.stateReq && this.driver.battle.world.tick % TICKS_PER_TURN === 0) {
      this.opts.sendState?.(this.stateReq, this.driver.battle.world.tick, this.driver.battle.serialize());
      this.stateReq = 0;
    }
    if (this.renderer && this.renderer.battle !== this.driver.battle) this.renderer.setBattle(this.driver.battle);
    if (this.renderer) {
      const me = this.me;
      const army = me && this.battle.world.phase === 'deploy' ? this.battle.army(me.army) : undefined;
      this.renderer.zone = army ? army.zone : null;
      this.updateFog(dt);
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

  /** Fog of war, four times a second; everything shows once the battle is over (or for spectators). */
  private updateFog(dt: number): void {
    const b = this.battle;
    const on = b.world.settings.fog && b.world.phase !== 'ended' && this.mySide >= 0;
    if (!on) {
      if (this.fog) {
        this.fog = null;
        this.renderer?.setFog(null);
      }
      return;
    }
    this.fogTimer -= dt;
    if (this.fog && this.fogTimer > 0) return;
    this.fogTimer = 0.25;
    if (!this.fog || this.fog.w !== Math.ceil(b.map.wm / 4)) this.fog = new FogOfWar(b);
    this.fog.update(b, this.mySide);
    this.renderer?.setFog(this.fog.data);
  }

  /** The side this player fights for (also while their army hasn't arrived yet). */
  get mySide(): number {
    const me = this.me;
    if (!me) return -1;
    const a = this.battle.army(me.army);
    if (a) return a.side;
    return this.battle.scenario.sides.findIndex((s) => s.slots.some((sl) => sl.key === me.slot));
  }

  private afterTick(b: Battle): void {
    this.renderer?.afterTick(b);
    const me = this.opts.playerId;
    // Our army has just arrived (a reserve slot): fly the camera to it.
    const p = this.me;
    if (p && p.army !== this.lastArmy) {
      const a = b.army(p.army);
      const g = a ? b.soldier(a.genSoldier) : undefined;
      if (this.lastArmy === 0 && g) {
        this.renderer?.rig.jump(g.x, g.y);
        this.messages.push({ id: b.world.tick * 100 + this.messages.length, text: `${a!.name} and ${a!.title} have arrived. They are yours to command!`, tone: 'epic', at: performance.now() });
      }
      this.lastArmy = p.army;
    }
    const mySide = this.mySide;
    if (this.renderer) this.sounds.onEvents(b.events, this.renderer.rig, mySide, me);
    for (const e of b.events) {
      if (e.k === 'end') music.play(e.winner === mySide || (mySide < 0 && e.winner >= 0) ? 'victory' : 'defeat');
    }
    for (const e of b.events) {
      if (e.k !== 'msg') continue;
      if (e.to && e.to !== me) continue;
      if (e.side >= 0 && e.side !== mySide) continue;
      this.messages.push({ id: b.world.tick * 100 + this.messages.length, text: e.text, tone: e.tone, at: performance.now() });
    }
    if (this.messages.length > 30) this.messages.splice(0, this.messages.length - 30);
    this.opts.onEvents?.(b.events, b);
  }

  /** Arrows for orders a General gave to human Commanders (or that this Commander received). */
  orderMarkers(): { fx: number; fy: number; tx: number; ty: number; mine: boolean }[] {
    const me = this.me;
    const b = this.battle;
    if (!me || b.world.phase !== 'battle') return [];
    const out: { fx: number; fy: number; tx: number; ty: number; mine: boolean }[] = [];
    for (const d of b.world.dets) {
      const forMe = me.role === 'commander' && d.id === me.det;
      const fromMe = me.role === 'general' && d.army === me.army && d.ctrl !== 0;
      if ((!forMe && !fromMe) || d.order.k === 'none') continue;
      let fx = 0;
      let fy = 0;
      let n = 0;
      for (const id of d.units) {
        const u = b.unit(id);
        if (!u || u.st === 'gone') continue;
        const c = b.center(u);
        fx += c.x;
        fy += c.y;
        n++;
      }
      if (!n) continue;
      const target = d.order.t ? b.unit(d.order.t) : undefined;
      const tc = target && target.st !== 'gone' ? b.center(target) : { x: d.order.x, y: d.order.y };
      out.push({ fx: fx / n, fy: fy / n, tx: tc.x, ty: tc.y, mine: forMe });
    }
    return out;
  }

  /** The relay wants our state; sent at the next turn boundary. */
  requestState(req: number): void {
    this.stateReq = req;
  }

  addMessage(text: string, tone: HudMessage['tone'] = 'info'): void {
    this.messages.push({ id: performance.now() * 1000 + this.messages.length, text, tone, at: performance.now() });
  }

  get multiplayer(): boolean {
    return !!this.opts.send;
  }

  togglePause(): void {
    if (this.clock) this.setPaused(!this.clock.paused);
    else this.opts.pause?.(!this.remotePaused);
  }

  ping(x: number, y: number): void {
    if (this.opts.ping) this.opts.ping(x, y);
    else this.renderer?.addPing(x, y, '#ffe680');
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
    this.input = null;
    this.renderer?.dispose();
    this.renderer = null;
  }
}
