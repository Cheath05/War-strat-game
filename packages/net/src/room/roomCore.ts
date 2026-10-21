// One game room on the relay: the lobby (who leads which army, the scenario, the rules)
// and, during a battle, the lockstep clock. It never simulates the battle; it collects
// orders, stamps them with the sender, and broadcasts them as numbered turns. It compares
// the players' world hashes and repairs anyone who drifts by copying a healthy player's
// state. Transport-agnostic: the Node host and the Cloudflare Durable Object both drive it.

import {
  TICK_HZ,
  TICKS_PER_TURN,
  armyCost,
  budgetFor,
  defaultSettings,
  listScenarios,
  recruitedArmy,
  scenarioChoices,
  scenarioDef,
  slotSide,
  validArmy,
  type ArmySetup,
  type ScenarioDef,
  type BattleSetup,
  type Command,
  type Settings,
  type TaggedCommand,
} from '@pl/sim';
import { PROTOCOL_VERSION, decode, type C2S, type LobbyPlayer, type LobbyState, type S2C } from '../protocol';

export interface RoomTransport {
  send(conn: number, msg: string): void;
  close(conn: number): void;
  now(): number;
  every(ms: number, fn: () => void): () => void;
}

interface Player extends LobbyPlayer {
  token: string;
  conn: number;
  cmdBudget: number;
  pauses: number;
}

const TURN_MS = (1000 * TICKS_PER_TURN) / TICK_HZ;
const MAX_PLAYERS = 8;

export class RoomCore {
  private players: Player[] = [];
  private conns = new Map<number, number>();
  private scenario: string;
  private settings: Settings = defaultSettings();
  private map: LobbyState['map'] = null;
  private armies: ArmySetup[] = [];
  private options: Record<string, string> = {};
  private phase: LobbyState['phase'] = 'lobby';
  private setup: BattleSetup | null = null;
  private turn = 0;
  private pending: TaggedCommand[] = [];
  /** Non-empty turns since the battle began (for resync and reconnect). */
  private history = new Map<number, TaggedCommand[]>();
  private hashes = new Map<number, Map<number, number>>();
  private paused = false;
  private stopTimer: (() => void) | null = null;
  private req = 0;
  /** Outstanding state requests: request id → players waiting for that state. */
  private waiting = new Map<number, Set<number>>();
  /** Who each request went to, who already failed to answer, and when. */
  private asked = new Map<number, { source: number; tried: Set<number>; at: number }>();
  private lastActive: number;

  constructor(
    readonly code: string,
    private io: RoomTransport,
  ) {
    this.scenario = listScenarios().find((s) => !s.hidden)?.id ?? 'field';
    this.options = scenarioChoices(this.scenario);
    this.lastActive = io.now();
  }

  get empty(): boolean {
    return !this.players.some((p) => p.conn >= 0);
  }

  get idleMs(): number {
    return this.empty ? this.io.now() - this.lastActive : 0;
  }

  get info(): { code: string; phase: string; players: number } {
    return { code: this.code, phase: this.phase, players: this.players.filter((p) => p.conn >= 0).length };
  }

  // --- Connections ------------------------------------------------------------------------

  /** A socket opened; it must say hello before anything else. */
  open(conn: number): void {
    this.conns.set(conn, 0);
  }

  close(conn: number): void {
    const pid = this.conns.get(conn);
    this.conns.delete(conn);
    if (!pid) return;
    const p = this.byId(pid);
    if (!p || p.conn !== conn) return;
    p.conn = -1;
    p.connected = false;
    this.lastActive = this.io.now();
    if (this.phase === 'battle' && p.role !== 'spectator') this.pending.push({ p: 0, c: { k: 'sys', e: 'leave', p: p.id } });
    if (p.host) this.passHost();
    this.broadcastLobby();
    this.note(`${p.name} disconnected.`);
  }

  message(conn: number, raw: string): void {
    const m = decode<C2S>(raw);
    if (!m) return;
    const pid = this.conns.get(conn);
    if (m.t === 'hello') {
      this.hello(conn, m);
      return;
    }
    if (!pid) return;
    const p = this.byId(pid);
    if (!p || p.conn !== conn) return;
    this.lastActive = this.io.now();
    switch (m.t) {
      case 'lobby':
        this.lobbyOp(p, m);
        return;
      case 'cmd':
        this.command(p, m.c);
        return;
      case 'hash':
        this.hash(p, m.tick, m.h);
        return;
      case 'state':
        this.stateArrived(m.req, m.tick, m.data);
        return;
      case 'chat': {
        const text = String(m.text ?? '').slice(0, 200).trim();
        if (text) this.broadcast({ t: 'chat', from: p.id, name: p.name, text });
        return;
      }
      case 'ping':
        if (this.phase === 'battle' && Number.isFinite(m.x) && Number.isFinite(m.y)) {
          this.broadcast({ t: 'ping', from: p.id, x: m.x, y: m.y, kind: String(m.kind).slice(0, 16) });
        }
        return;
      case 'pause':
        this.pause(p, !!m.on);
        return;
      case 'endBattle':
        if (p.host && this.phase === 'battle') this.endBattle();
        return;
    }
  }

  private hello(conn: number, m: Extract<C2S, { t: 'hello' }>): void {
    if (m.v !== PROTOCOL_VERSION) {
      this.sendTo(conn, { t: 'error', msg: 'This game was updated: please reload the page.' });
      return;
    }
    const name = String(m.name ?? '').trim().slice(0, 20) || 'Commander';
    let p = m.token ? this.players.find((x) => x.token === m.token) : undefined;
    if (p) {
      // A returning player (reconnect or reload).
      if (p.conn >= 0 && p.conn !== conn) this.io.close(p.conn);
      p.conn = conn;
      p.connected = true;
      p.name = name;
      if (this.phase === 'battle' && p.role !== 'spectator') this.pending.push({ p: 0, c: { k: 'sys', e: 'join', p: p.id } });
    } else {
      if (this.players.length >= MAX_PLAYERS) {
        this.sendTo(conn, { t: 'error', msg: 'This room is full.' });
        return;
      }
      const id = this.nextId();
      p = {
        id,
        name,
        connected: true,
        ready: false,
        role: 'spectator',
        slot: '',
        det: 0,
        host: !this.players.some((x) => x.host && x.conn >= 0),
        token: makeToken(this.io.now(), id),
        conn,
        cmdBudget: 40,
        pauses: 3,
      };
      if (p.host) for (const x of this.players) x.host = false;
      this.players.push(p);
      if (this.phase === 'lobby') this.autoClaim(p);
    }
    this.conns.set(conn, p.id);
    // A room always has a connected host.
    if (!this.players.some((x) => x.host && x.conn >= 0)) for (const x of this.players) x.host = x === p;
    this.sendTo(conn, { t: 'welcome', you: p.id, token: p.token, lobby: this.lobbyState(), v: PROTOCOL_VERSION });
    this.broadcastLobby();
    this.note(`${p.name} joined.`);
    if (this.phase === 'battle' && this.setup) {
      // Bring them into the running battle: they need the current state from someone.
      this.requestState(new Set([p.id]));
    }
  }

  private nextId(): number {
    for (let id = 1; id < 100; id++) if (!this.players.some((p) => p.id === id)) return id;
    return 100 + this.players.length;
  }

  private byId(id: number): Player | undefined {
    return this.players.find((p) => p.id === id);
  }

  private passHost(): void {
    const next = this.players.find((p) => p.conn >= 0);
    for (const p of this.players) p.host = p === next;
  }

  // --- Lobby ------------------------------------------------------------------------------

  private lobbyState(): LobbyState {
    return {
      code: this.code,
      phase: this.phase,
      scenario: this.scenario,
      settings: this.settings,
      map: this.map,
      players: this.players.map(({ id, name, connected, ready, role, slot, det, host }) => ({ id, name, connected, ready, role, slot, det, host })),
      armies: this.armies,
      options: this.options,
    };
  }

  /** The scenario with the lobby's choices applied. */
  private sc(): ScenarioDef {
    return scenarioDef(this.scenario, this.options);
  }

  private broadcastLobby(): void {
    this.broadcast({ t: 'lobby', lobby: this.lobbyState() });
  }

  /** New players take the first free General slot, so a quick game needs no clicking. */
  private autoClaim(p: Player): void {
    const sc = this.sc();
    for (const side of sc.sides) {
      if (side.aiOnly) continue;
      for (const slot of side.slots) {
        if (slot.reserve) continue;
        if (!this.players.some((x) => x !== p && x.role === 'general' && x.slot === slot.key)) {
          p.role = 'general';
          p.slot = slot.key;
          p.det = 0;
          return;
        }
      }
    }
  }

  private lobbyOp(p: Player, m: Extract<C2S, { t: 'lobby' }>): void {
    if (m.op === 'name') {
      p.name = String(m.name ?? '').trim().slice(0, 20) || p.name;
      this.broadcastLobby();
      return;
    }
    if (this.phase !== 'lobby') return;
    switch (m.op) {
      case 'scenario': {
        if (!p.host) return;
        const ok = listScenarios().some((s) => s.id === m.id);
        if (!ok) return;
        this.scenario = m.id;
        this.options = scenarioChoices(m.id);
        this.armies = [];
        for (const x of this.players) {
          x.role = 'spectator';
          x.slot = '';
          x.ready = false;
        }
        for (const x of this.players) if (x.conn >= 0) this.autoClaim(x);
        break;
      }
      case 'settings':
        if (!p.host) return;
        this.settings = sanitizeSettings(m.settings);
        for (const x of this.players) x.ready = false;
        break;
      case 'map':
        if (!p.host) return;
        this.map = m.map;
        break;
      case 'options':
        // New choices can change factions and maps: recruited armies start over.
        if (!p.host) return;
        this.options = scenarioChoices(this.scenario, m.options ?? {});
        this.armies = [];
        for (const x of this.players) x.ready = false;
        break;
      case 'claim':
        this.claim(p, m.role, String(m.slot ?? ''), Math.max(0, Math.floor(Number(m.det) || 0)));
        break;
      case 'ready':
        p.ready = !!m.on;
        break;
      case 'army': {
        // A General recruited an army for their slot (gold modes); the relay checks the bill.
        if (p.role !== 'general') return;
        const sc = this.sc();
        const units = Array.isArray(m.units) ? m.units.map(String).slice(0, 40) : [];
        const others = this.armies.filter((a) => a.slot !== p.slot);
        if (!units.length) {
          this.armies = others;
          break;
        }
        const side = slotSide(sc, p.slot);
        const army = recruitedArmy(sc, p.slot, units);
        if (!army || !sc.recruit || !validArmy(army.faction, units, budgetFor(sc, side), sc.recruit.maxUnits)) return;
        this.armies = [...others, army];
        break;
      }
      case 'kick': {
        if (!p.host || m.id === p.id) return;
        const k = this.byId(m.id);
        if (k) {
          if (k.conn >= 0) this.io.close(k.conn);
          this.players = this.players.filter((x) => x !== k);
        }
        break;
      }
      case 'start':
        if (!p.host) return;
        this.start();
        return;
    }
    this.broadcastLobby();
  }

  private claim(p: Player, role: LobbyPlayer['role'], slot: string, det: number): void {
    if (role === 'spectator') {
      p.role = 'spectator';
      p.slot = '';
      return;
    }
    const sc = this.sc();
    const def = sc.sides.filter((s) => !s.aiOnly).flatMap((s) => s.slots).find((s) => s.key === slot);
    if (!def) return;
    if (role === 'general') {
      if (this.players.some((x) => x !== p && x.role === 'general' && x.slot === slot)) return;
      p.role = 'general';
      p.slot = slot;
      p.det = 0;
    } else {
      const army = this.armies.find((a) => a.slot === slot);
      const dets = army ? army.dets.length : def.dets.length;
      if (det >= dets) return;
      if (this.players.some((x) => x !== p && x.role === 'commander' && x.slot === slot && x.det === det)) return;
      p.role = 'commander';
      p.slot = slot;
      p.det = det;
    }
    p.ready = false;
  }

  /** Gold a player starts the battle with: what a General didn't spend on the army. */
  private startGold(p: Player): number | undefined {
    const sc = this.sc();
    if (!sc.recruit || p.role !== 'general') return sc.recruit ? 0 : undefined;
    const side = slotSide(sc, p.slot);
    const army = this.armies.find((a) => a.slot === p.slot);
    const def = sc.sides[side]?.slots.find((s) => s.key === p.slot);
    const units = (army ?? def)?.dets.flatMap((d) => d.units) ?? [];
    return Math.max(0, budgetFor(sc, side) - armyCost(units));
  }

  // --- Battle -----------------------------------------------------------------------------

  private start(): void {
    if (this.phase !== 'lobby') return;
    const seed = Math.floor((this.io.now() * 7919) % 2147483647) ^ 0x5bd1e995;
    const setup: BattleSetup = {
      seed: seed | 0,
      scenario: this.scenario,
      settings: this.settings,
      map: this.map ?? undefined,
      players: this.players.map((p) => ({ id: p.id, name: p.name, role: p.role, slot: p.slot, det: p.det, gold: this.startGold(p) })),
      armies: this.armies.length ? this.armies : undefined,
      options: this.options,
    };
    this.setup = setup;
    this.phase = 'battle';
    this.turn = 0;
    this.pending = [];
    this.history.clear();
    this.hashes.clear();
    this.paused = false;
    for (const p of this.players) {
      p.ready = false;
      p.pauses = 3;
    }
    this.broadcastLobby();
    this.broadcast({ t: 'start', setup });
    // Mark players who aren't connected right now as away, so the AI runs their troops.
    for (const p of this.players) if (p.conn < 0 && p.role !== 'spectator') this.pending.push({ p: 0, c: { k: 'sys', e: 'leave', p: p.id } });
    this.stopTimer = this.io.every(TURN_MS, () => this.tickTurn());
  }

  private tickTurn(): void {
    if (this.phase !== 'battle') return;
    if (this.turn % 10 === 0) this.checkStalledRequests();
    if (this.paused) return;
    for (const p of this.players) p.cmdBudget = Math.min(60, p.cmdBudget + 6);
    const n = this.turn++;
    const c = this.pending;
    this.pending = [];
    if (c.length) this.history.set(n, c);
    this.broadcast(c.length ? { t: 'turn', n, c } : { t: 'turn', n });
    // Forget hash reports nobody will complete.
    const oldest = (n - 600) * TICKS_PER_TURN;
    for (const tick of this.hashes.keys()) if (tick < oldest) this.hashes.delete(tick);
  }

  private command(p: Player, c: Command): void {
    if (this.phase !== 'battle' || p.role === 'spectator' || !c || typeof c !== 'object') return;
    if (c.k === 'sys') return;
    if (p.cmdBudget <= 0) return;
    p.cmdBudget--;
    this.pending.push({ p: p.id, c });
  }

  private hash(p: Player, tick: number, h: number): void {
    if (this.phase !== 'battle' || !Number.isInteger(tick)) return;
    // Someone being resynced reports from a drifted world until the fix arrives.
    for (const who of this.waiting.values()) if (who.has(p.id)) return;
    let m = this.hashes.get(tick);
    if (!m) {
      m = new Map();
      this.hashes.set(tick, m);
    }
    m.set(p.id, h >>> 0);
    const live = this.players.filter((x) => x.conn >= 0);
    if (!live.every((x) => m!.has(x.id))) return;
    this.hashes.delete(tick);
    // Majority wins; on a tie, the host's version.
    const votes = new Map<number, number>();
    for (const v of m.values()) votes.set(v, (votes.get(v) ?? 0) + 1);
    if (votes.size <= 1) return;
    const host = this.players.find((x) => x.host);
    let good = host ? m.get(host.id)! : [...m.values()][0]!;
    let best = votes.get(good) ?? 0;
    for (const [v, n] of votes) {
      if (n > best) {
        best = n;
        good = v;
      }
    }
    const bad = new Set<number>();
    for (const [pid, v] of m) if (v !== good) bad.add(pid);
    const healthy = live.find((x) => m!.get(x.id) === good);
    if (!healthy || !bad.size) return;
    this.note(`Resynchronising ${[...bad].map((id) => this.byId(id)?.name).join(', ')} (battles had drifted apart at tick ${tick}).`);
    this.requestState(bad, healthy);
  }

  /** Asks a healthy player for the battle state, to send to `who`. */
  private requestState(who: Set<number>, from?: Player, tried: Set<number> = new Set()): void {
    const source = from ?? this.players.find((x) => x.conn >= 0 && !who.has(x.id) && !tried.has(x.id));
    if (!source) {
      this.replayFromStart(who);
      return;
    }
    const req = ++this.req;
    this.waiting.set(req, new Set(who));
    this.asked.set(req, { source: source.id, tried: new Set([...tried, source.id]), at: this.io.now() });
    this.sendTo(source.conn, { t: 'stateReq', req });
  }

  /** Nobody can share a state: rebuild from the setup and every turn so far. */
  private replayFromStart(who: Set<number>): void {
    if (!this.setup) return;
    for (const id of who) {
      const p = this.byId(id);
      if (p && p.conn >= 0) {
        this.sendTo(p.conn, { t: 'start', setup: this.setup });
        this.replayTurns(p, 0);
      }
    }
  }

  private stateArrived(req: number, tick: number, data: string): void {
    const who = this.waiting.get(req);
    const ask = this.asked.get(req);
    if (!who || !this.setup) return;
    this.waiting.delete(req);
    this.asked.delete(req);
    if (typeof data !== 'string' || !data || tick < 0) {
      // That player had no battle to share (they are rejoining too): try someone else.
      this.requestState(who, undefined, ask?.tried ?? new Set());
      return;
    }
    for (const id of who) {
      const p = this.byId(id);
      if (!p || p.conn < 0) continue;
      this.sendTo(p.conn, { t: 'resync', tick, data, setup: this.setup });
      this.replayTurns(p, Math.floor(tick / TICKS_PER_TURN));
    }
  }

  /** State requests nobody answered within a few seconds go elsewhere. */
  private checkStalledRequests(): void {
    const now = this.io.now();
    for (const [req, ask] of this.asked) {
      if (now - ask.at < 6000) continue;
      const who = this.waiting.get(req);
      this.asked.delete(req);
      this.waiting.delete(req);
      if (who) this.requestState(who, undefined, ask.tried);
    }
  }

  /** Re-sends every turn from `from` up to now, empty ones included, so the gap has no holes. */
  private replayTurns(p: Player, from: number): void {
    for (let n = from; n < this.turn; n++) {
      const c = this.history.get(n);
      this.sendTo(p.conn, c ? { t: 'turn', n, c } : { t: 'turn', n });
    }
  }

  private pause(p: Player, on: boolean): void {
    if (this.phase !== 'battle' || p.role === 'spectator') return;
    if (on && !this.paused) {
      if (p.pauses <= 0) {
        this.sendTo(p.conn, { t: 'note', text: 'You have used all your pauses.' });
        return;
      }
      p.pauses--;
    }
    this.paused = on;
    this.broadcast({ t: 'paused', on, by: p.name });
  }

  private endBattle(): void {
    this.stopTimer?.();
    this.stopTimer = null;
    this.phase = 'lobby';
    this.setup = null;
    this.history.clear();
    for (const p of this.players) p.ready = false;
    this.broadcast({ t: 'ended' });
    this.broadcastLobby();
  }

  /** Stops timers (the room is being thrown away). */
  dispose(): void {
    this.stopTimer?.();
    this.stopTimer = null;
  }

  // --- Sending ----------------------------------------------------------------------------

  private sendTo(conn: number, m: S2C): void {
    if (conn >= 0) this.io.send(conn, JSON.stringify(m));
  }

  private broadcast(m: S2C): void {
    const raw = JSON.stringify(m);
    for (const p of this.players) if (p.conn >= 0) this.io.send(p.conn, raw);
  }

  private note(text: string): void {
    this.broadcast({ t: 'note', text });
  }
}

function makeToken(now: number, id: number): string {
  let s = '';
  for (let i = 0; i < 24; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)];
  return `${id}.${now.toString(36)}.${s}`;
}

function sanitizeSettings(s: Settings): Settings {
  const d = defaultSettings();
  if (!s || typeof s !== 'object') return d;
  return {
    morale: s.morale !== false,
    fatigue: s.fatigue !== false,
    ammo: s.ammo !== false,
    fog: !!s.fog,
    unitSize: [0.5, 1, 1.5, 2].includes(Number(s.unitSize)) ? Number(s.unitSize) : 1,
    difficulty: [0, 1, 2, 3].includes(Number(s.difficulty)) ? Number(s.difficulty) : 1,
    timeLimit: Math.max(0, Math.min(7200, Math.round(Number(s.timeLimit) || 0))),
    friendlyFire: !!s.friendlyFire,
  };
}
