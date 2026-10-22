// Messages between players' browsers and the relay. JSON over a WebSocket.

import type { ArmySetup, BattleSetup, Command, MapRef, Settings, TaggedCommand } from '@pl/sim';

export const PROTOCOL_VERSION = 6;

export interface LobbyPlayer {
  id: number;
  name: string;
  connected: boolean;
  ready: boolean;
  role: 'general' | 'commander' | 'spectator';
  /** Army slot key ('' when spectating). */
  slot: string;
  /** Detachment index within the army, for commanders. */
  det: number;
  host: boolean;
}

export interface LobbyState {
  code: string;
  phase: 'lobby' | 'battle';
  scenario: string;
  settings: Settings;
  map: MapRef | null;
  players: LobbyPlayer[];
  /** Recruited armies (gold modes), by slot. */
  armies: ArmySetup[];
  /** Choices for scenarios with options (map, factions...). */
  options: Record<string, string>;
}

export type LobbyOp =
  | { op: 'scenario'; id: string }
  | { op: 'settings'; settings: Settings }
  | { op: 'map'; map: MapRef | null }
  | { op: 'claim'; role: LobbyPlayer['role']; slot: string; det: number }
  | { op: 'ready'; on: boolean }
  /**
   * A General's recruited army (gold modes and sandbox); an empty list goes back to the default
   * army. In a sandbox the host may also set up an AI-led army by its slot.
   */
  | { op: 'army'; units: string[]; slot?: string }
  | { op: 'options'; options: Record<string, string> }
  | { op: 'start' }
  | { op: 'kick'; id: number }
  | { op: 'name'; name: string };

/** Client → relay. */
export type C2S =
  | { t: 'hello'; name: string; token?: string; v: number }
  | ({ t: 'lobby' } & LobbyOp)
  | { t: 'cmd'; c: Command }
  | { t: 'hash'; tick: number; h: number }
  /** Answer to stateReq; tick -1 and empty data mean "I have no battle to share". */
  | { t: 'state'; req: number; tick: number; data: string }
  | { t: 'chat'; text: string }
  | { t: 'ping'; x: number; y: number; kind: string }
  | { t: 'pause'; on: boolean }
  | { t: 'endBattle' };

/** Relay → client. */
export type S2C =
  | { t: 'welcome'; you: number; token: string; lobby: LobbyState; v: number }
  | { t: 'lobby'; lobby: LobbyState }
  | { t: 'start'; setup: BattleSetup }
  /** Turn n: its commands apply at tick n * TICKS_PER_TURN. c is omitted when empty. */
  | { t: 'turn'; n: number; c?: TaggedCommand[] }
  /** Send your state at the next turn boundary. */
  | { t: 'stateReq'; req: number }
  /** Load this state (taken at the start of `tick`); the turns from there follow. */
  | { t: 'resync'; tick: number; data: string; setup: BattleSetup }
  | { t: 'chat'; from: number; name: string; text: string }
  | { t: 'ping'; from: number; x: number; y: number; kind: string }
  | { t: 'paused'; on: boolean; by: string }
  | { t: 'note'; text: string }
  | { t: 'error'; msg: string }
  | { t: 'ended' };

export function encode(m: C2S | S2C): string {
  return JSON.stringify(m);
}

export function decode<T>(raw: string): T | null {
  try {
    const m = JSON.parse(raw);
    return m && typeof m === 'object' && typeof m.t === 'string' ? (m as T) : null;
  } catch {
    return null;
  }
}

/** Room codes: four letters without easily confused ones. */
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
export function randomCode(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += LETTERS[Math.floor(rand() * LETTERS.length)];
  return s;
}

export function validCode(code: string): boolean {
  return /^[A-Z]{4}$/.test(code);
}
