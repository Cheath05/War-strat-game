// The client side of lockstep. Holds the local copy of the battle and advances it only as
// far as the relay's turns allow; sends this player's commands to the relay; reports a
// hash every HASH_EVERY ticks; swaps in a fresh state on resync.

import { Battle, HASH_EVERY, TICK_HZ, TICKS_PER_TURN, type Command, type TaggedCommand } from '@pl/sim';

export interface DriverHooks {
  /** Sends one of this player's commands to the relay. */
  send(cmd: Command): void;
  /** Reports the world hash at a tick (for desync detection). */
  hash?(tick: number, hash: number): void;
  /** Called right before each simulated tick (renderers snapshot positions here). */
  beforeTick?(b: Battle): void;
  /** Called after each simulated tick with that tick's events. */
  afterTick?(b: Battle): void;
}

const TICK_MS = 1000 / TICK_HZ;

/** Wall-clock milliseconds (only for pacing; never feeds the simulation). */
const clock = (globalThis as { performance?: { now(): number } }).performance;
const now = (): number => (clock ? clock.now() : Date.now());

export class LockstepDriver {
  battle: Battle;
  /** Commands per turn number, waiting to be simulated. */
  private turns = new Map<number, TaggedCommand[]>();
  /** Highest turn number received with no gaps before it. */
  private lastTurn = -1;
  private acc = 0;
  /** 0..1: how far we are between the last tick and the next (for rendering). */
  alpha = 0;
  /** Ticks we could simulate right now (how far behind the relay we are). */
  backlog = 0;
  paused = false;

  constructor(
    battle: Battle,
    private hooks: DriverHooks,
  ) {
    this.battle = battle;
    this.lastTurn = Math.floor(battle.world.tick / TICKS_PER_TURN) - 1;
  }

  /** A turn from the relay. Turn n's commands apply at tick n * TICKS_PER_TURN. */
  receiveTurn(n: number, cmds: TaggedCommand[]): void {
    if (n <= this.lastTurn) return;
    this.turns.set(n, cmds);
    while (this.turns.has(this.lastTurn + 1)) this.lastTurn++;
  }

  issue(cmd: Command): void {
    this.hooks.send(cmd);
  }

  /** Advances by real time. Returns the number of ticks simulated. */
  update(dtMs: number): number {
    const w = this.battle.world;
    const limit = (this.lastTurn + 1) * TICKS_PER_TURN;
    this.backlog = limit - w.tick;
    if (this.paused || this.backlog <= 0) {
      this.alpha = 1;
      return 0;
    }
    let n = 0;
    if (this.backlog > 20) {
      // Far behind (the tab was in the background, or we just rejoined): catch up as fast
      // as the frame budget allows, about 12 ms of simulation per frame.
      const start = now();
      while (w.tick < limit - 2 && now() - start < 12) {
        this.stepOne();
        n++;
      }
      this.acc = 0;
    } else {
      // Close to the relay: real time, a little faster when a few ticks behind.
      const speed = this.backlog > 6 ? 1.5 : 1;
      this.acc += Math.min(dtMs, 250) * speed;
      while (this.acc >= TICK_MS && w.tick < limit && n < 6) {
        this.stepOne();
        this.acc -= TICK_MS;
        n++;
      }
      if (w.tick >= limit) this.acc = Math.min(this.acc, TICK_MS);
    }
    this.backlog = limit - w.tick;
    this.alpha = Math.max(0, Math.min(1, this.acc / TICK_MS));
    return n;
  }

  private stepOne(): void {
    const b = this.battle;
    const tick = b.world.tick;
    const cmds = tick % TICKS_PER_TURN === 0 ? (this.turns.get(tick / TICKS_PER_TURN) ?? []) : [];
    if (tick % TICKS_PER_TURN === TICKS_PER_TURN - 1) this.turns.delete((tick - (TICKS_PER_TURN - 1)) / TICKS_PER_TURN);
    this.hooks.beforeTick?.(b);
    b.step(cmds);
    this.hooks.afterTick?.(b);
    if (b.world.tick % HASH_EVERY === 0) this.hooks.hash?.(b.world.tick, b.lastHash);
  }

  /** Replaces the battle with a snapshot taken at the start of its world.tick. */
  resync(stateJson: string): void {
    const b = Battle.load(stateJson);
    this.battle = b;
    // Keep turns from the snapshot's tick on; older ones are already in the state.
    const first = Math.floor(b.world.tick / TICKS_PER_TURN);
    for (const n of [...this.turns.keys()]) if (n < first) this.turns.delete(n);
    this.lastTurn = first - 1;
    while (this.turns.has(this.lastTurn + 1)) this.lastTurn++;
    this.acc = 0;
  }

  /** Simulates every available tick right away (tests and headless bots). */
  drain(): number {
    let n = 0;
    const limit = (this.lastTurn + 1) * TICKS_PER_TURN;
    while (this.battle.world.tick < limit) {
      this.stepOne();
      n++;
    }
    return n;
  }
}
