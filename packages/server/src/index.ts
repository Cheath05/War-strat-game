// Node host for development and LAN games: serves the built client and runs game rooms
// (the same RoomCore the Cloudflare Durable Object uses) over WebSockets.
//   npm run dev  → relay on :8090 (the Vite client on :5190 proxies to it)
//   npm run host → also serves the built client, for friends on the same network

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import { RoomCore, randomCode, validCode, type RoomTransport } from '@pl/net';

// RELAY_PORT, not PORT: dev launchers set PORT for the Vite client.
const PORT = Number(process.env.RELAY_PORT ?? 8090);
const DIST = fileURLToPath(new URL('../../client/dist/', import.meta.url));
const rooms = new Map<string, RoomCore>();
const sockets = new Map<number, WebSocket>();
let nextConn = 1;

const transport: RoomTransport = {
  send(conn, msg) {
    const ws = sockets.get(conn);
    if (ws && ws.readyState === ws.OPEN) ws.send(msg);
  },
  close(conn) {
    sockets.get(conn)?.close();
  },
  now: () => Date.now(),
  every(ms, fn) {
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
  },
};

function room(code: string): RoomCore {
  let r = rooms.get(code);
  if (!r) {
    r = new RoomCore(code, transport);
    rooms.set(code, r);
  }
  return r;
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json',
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  if (req.method === 'POST' && url.pathname === '/api/rooms') {
    let code = randomCode();
    for (let i = 0; i < 50 && rooms.has(code); i++) code = randomCode();
    room(code);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ code }));
    return;
  }
  const m = /^\/api\/rooms\/([A-Z]{4})$/.exec(url.pathname);
  if (m) {
    const r = rooms.get(m[1]!);
    res.writeHead(r ? 200 : 404, { 'content-type': 'application/json' });
    res.end(JSON.stringify(r ? r.info : { error: 'No such room' }));
    return;
  }
  // Static files from the built client, with the SPA fallback.
  if (!existsSync(DIST)) {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('Pixel Legions relay is running. Build the client (npm run build) to serve the game here, or use npm run dev.');
    return;
  }
  let path = normalize(join(DIST, decodeURIComponent(url.pathname)));
  if (!path.startsWith(DIST) || !existsSync(path) || statSync(path).isDirectory()) path = join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'cache-control': path.endsWith('index.html') ? 'no-cache' : 'max-age=86400' });
  createReadStream(path).pipe(res);
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 * 1024 });
server.on('upgrade', (req, socket, head) => {
  const m = /^\/ws\/([A-Z]{4})$/.exec(new URL(req.url ?? '/', 'http://x').pathname);
  if (!m || !validCode(m[1]!)) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    const r = room(m[1]!);
    const conn = nextConn++;
    sockets.set(conn, ws);
    r.open(conn);
    ws.on('message', (data) => r.message(conn, data.toString()));
    ws.on('close', () => {
      sockets.delete(conn);
      r.close(conn);
    });
  });
});

// Rooms nobody has been in for 10 minutes are closed.
setInterval(() => {
  for (const [code, r] of rooms) {
    if (r.empty && r.idleMs > 10 * 60 * 1000) {
      r.dispose();
      rooms.delete(code);
    }
  }
}, 60 * 1000);

server.listen(PORT, () => {
  console.log(`Pixel Legions relay on http://localhost:${PORT}`);
  if (process.argv.includes('--lan')) {
    for (const list of Object.values(networkInterfaces())) {
      for (const n of list ?? []) {
        if (n.family === 'IPv4' && !n.internal) console.log(`  Friends on your network: http://${n.address}:${PORT}`);
      }
    }
  }
});
