// The public link: a Cloudflare Worker that serves the built client (static assets) and
// sends /api and /ws requests to one Durable Object per room. The Durable Object runs the
// same RoomCore as the Node host, so rooms behave identically on both.
//
// Free-plan budget: every player sends a few messages a second (orders and a once-a-second
// hash); Cloudflare bills 20 incoming WebSocket messages as one request and outgoing ones
// not at all, so a four-player evening is a few thousand of the 100,000 daily requests.

import { DurableObject } from 'cloudflare:workers';
import { RoomCore, randomCode, validCode, type RoomTransport } from '@pl/net';

export interface Env {
  ROOMS: DurableObjectNamespace<GameRoom>;
  ASSETS: Fetcher;
}

/** A room code stays reserved this long after it was made, even while nobody is in it. */
const RESERVED_MS = 6 * 60 * 60 * 1000;
/** An empty room closes (its clock stops, so the object can sleep) after this long. */
const EMPTY_MS = 3 * 60 * 1000;

export class GameRoom extends DurableObject<Env> {
  private core: RoomCore | null = null;
  private sockets = new Map<number, WebSocket>();
  private nextConn = 1;
  private sweep: ReturnType<typeof setInterval> | null = null;

  private readonly io: RoomTransport = {
    send: (conn, msg) => {
      const ws = this.sockets.get(conn);
      if (ws && ws.readyState === WebSocket.READY_STATE_OPEN) ws.send(msg);
    },
    close: (conn) => this.sockets.get(conn)?.close(1000, 'closed'),
    now: () => Date.now(),
    every: (ms, fn) => {
      const id = setInterval(fn, ms);
      return () => clearInterval(id);
    },
  };

  private room(code: string): RoomCore {
    if (!this.core) this.core = new RoomCore(code, this.io);
    // Check now and then whether everyone has gone, and close the room if so.
    this.sweep ??= setInterval(() => {
      if (this.core && this.core.empty && this.core.idleMs > EMPTY_MS) {
        this.core.dispose();
        this.core = null;
      }
      if (!this.core && this.sweep) {
        clearInterval(this.sweep);
        this.sweep = null;
      }
    }, 30 * 1000);
    return this.core;
  }

  override async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const code = url.searchParams.get('code') ?? '';
    if (!validCode(code)) return new Response('Bad room code', { status: 400 });
    const made = (await this.ctx.storage.get<number>('made')) ?? 0;
    const reserved = Date.now() - made < RESERVED_MS;

    if (url.pathname === '/create') {
      if (this.core || reserved) return Response.json({ error: 'Room code taken' }, { status: 409 });
      await this.ctx.storage.put('made', Date.now());
      this.room(code);
      return Response.json({ code });
    }
    if (url.pathname === '/info') {
      if (this.core) return Response.json(this.core.info);
      if (reserved) return Response.json({ code, phase: 'lobby', players: 0 });
      return Response.json({ error: 'No such room' }, { status: 404 });
    }
    if (url.pathname === '/ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      server.accept();
      const r = this.room(code);
      const conn = this.nextConn++;
      this.sockets.set(conn, server);
      r.open(conn);
      server.addEventListener('message', (e) => r.message(conn, typeof e.data === 'string' ? e.data : new TextDecoder().decode(e.data)));
      const gone = (): void => {
        if (!this.sockets.delete(conn)) return;
        this.core?.close(conn);
      };
      server.addEventListener('close', gone);
      server.addEventListener('error', gone);
      return new Response(null, { status: 101, webSocket: client });
    }
    return new Response('Not found', { status: 404 });
  }
}

function stub(env: Env, code: string): DurableObjectStub<GameRoom> {
  return env.ROOMS.get(env.ROOMS.idFromName(code));
}

export default {
  async fetch(req, env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/api/rooms') {
      // A fresh code: try until one isn't taken.
      for (let i = 0; i < 20; i++) {
        const code = randomCode();
        const res = await stub(env, code).fetch(`https://room/create?code=${code}`, { method: 'POST' });
        if (res.ok) return res;
      }
      return Response.json({ error: 'No free room code, try again' }, { status: 503 });
    }
    const info = /^\/api\/rooms\/([A-Z]{4})$/.exec(url.pathname);
    if (info && validCode(info[1]!)) return stub(env, info[1]!).fetch(`https://room/info?code=${info[1]}`);
    const ws = /^\/ws\/([A-Z]{4})$/.exec(url.pathname);
    if (ws && validCode(ws[1]!)) return stub(env, ws[1]!).fetch(new Request(`https://room/ws?code=${ws[1]}`, req));
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
