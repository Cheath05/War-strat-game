// The browser's link to a game room on the relay: a WebSocket that says hello with the
// player's name, remembers the room token (so a reload or a dropped connection comes back
// as the same player), and reconnects on its own.

import { PROTOCOL_VERSION, decode, type C2S, type S2C } from '@pl/net';

export type ConnStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

const tokenKey = (code: string): string => `pl.token.${code}`;

export class RoomConnection {
  private ws: WebSocket | null = null;
  private closedByUs = false;
  private retry = 0;
  status: ConnStatus = 'connecting';
  onMessage: (m: S2C) => void = () => {};
  onStatus: (s: ConnStatus) => void = () => {};

  constructor(
    readonly code: string,
    private name: string,
  ) {}

  connect(): void {
    this.closedByUs = false;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${location.host}/ws/${this.code}`);
    this.ws = ws;
    this.setStatus(this.retry ? 'reconnecting' : 'connecting');
    ws.onopen = () => {
      this.retry = 0;
      this.setStatus('open');
      let token: string | undefined;
      try {
        token = sessionStorage.getItem(tokenKey(this.code)) ?? undefined;
      } catch {
        token = undefined;
      }
      this.send({ t: 'hello', name: this.name, token, v: PROTOCOL_VERSION });
    };
    ws.onmessage = (ev) => {
      const m = decode<S2C>(String(ev.data));
      if (!m) return;
      if (m.t === 'welcome') {
        try {
          sessionStorage.setItem(tokenKey(this.code), m.token);
        } catch {
          // fine: no reconnect identity
        }
      }
      this.onMessage(m);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      if (this.closedByUs) {
        this.setStatus('closed');
        return;
      }
      this.retry++;
      this.setStatus('reconnecting');
      setTimeout(() => !this.closedByUs && this.connect(), Math.min(8000, 500 * 2 ** Math.min(4, this.retry)));
    };
  }

  private setStatus(s: ConnStatus): void {
    this.status = s;
    this.onStatus(s);
  }

  send(m: C2S): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  close(): void {
    this.closedByUs = true;
    this.ws?.close();
    this.ws = null;
  }
}

/** Asks the relay for a fresh room code. */
export async function createRoom(): Promise<string> {
  const res = await fetch('/api/rooms', { method: 'POST' });
  if (!res.ok) throw new Error(`The relay said ${res.status}`);
  const j = (await res.json()) as { code: string };
  return j.code;
}

export async function roomExists(code: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/rooms/${code}`);
    return res.ok;
  } catch {
    return false;
  }
}
