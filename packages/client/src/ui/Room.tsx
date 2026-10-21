import { useEffect, useRef, useState } from 'react';
import { Battle } from '@pl/sim';
import type { LobbyState, S2C } from '@pl/net';
import { RoomConnection, type ConnStatus } from '../net/connection';
import { loadProfile } from '../app/profile';
import { GameSession } from '../game/session';
import { loadGraphics } from '../game/render/quality';
import { sharedArt } from '../game/render/BattleRenderer';
import { Lobby, type ChatLine } from './Lobby';
import { Hud } from './Hud';

/** A multiplayer room: the lobby, then the battle, over one connection to the relay. */
export function Room({ code, exit }: { code: string; exit: () => void }) {
  const conn = useRef<RoomConnection | null>(null);
  const me = useRef(0);
  const session = useRef<GameSession | null>(null);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [error, setError] = useState('');
  const [inBattle, setInBattle] = useState<GameSession | null>(null);

  useEffect(() => {
    const c = new RoomConnection(code, loadProfile().name || 'Commander');
    conn.current = c;
    const startSession = (battle: Battle): void => {
      session.current?.stop();
      const s = new GameSession(battle, {
        playerId: me.current,
        graphics: loadGraphics(),
        send: (cmd) => c.send({ t: 'cmd', c: cmd }),
        hash: (tick, h) => c.send({ t: 'hash', tick, h }),
        sendState: (req, tick, data) => c.send({ t: 'state', req, tick, data }),
        pause: (on) => c.send({ t: 'pause', on }),
        ping: (x, y) => c.send({ t: 'ping', x, y, kind: 'look' }),
      });
      session.current = s;
      setInBattle(s);
    };
    c.onStatus = setStatus;
    c.onMessage = (m: S2C) => {
      const s = session.current;
      switch (m.t) {
        case 'welcome':
          me.current = m.you;
          setLobby(m.lobby);
          setError('');
          break;
        case 'lobby':
          setLobby(m.lobby);
          break;
        case 'start':
          // Build the battle now so turns arriving right after are not lost.
          sharedArt();
          startSession(Battle.create(m.setup));
          break;
        case 'turn':
          s?.driver.receiveTurn(m.n, m.c ?? []);
          break;
        case 'stateReq':
          if (s) s.requestState(m.req);
          else c.send({ t: 'state', req: m.req, tick: -1, data: '' });
          break;
        case 'resync':
          if (s) {
            s.driver.resync(m.data);
            s.addMessage('Back in step with the other players.', 'info');
          } else startSession(Battle.load(m.data));
          break;
        case 'chat':
          setChat((l) => [...l.slice(-40), { from: m.from, name: m.name, text: m.text }]);
          s?.addMessage(`${m.name}: ${m.text}`, 'info');
          break;
        case 'ping':
          s?.renderer?.addPing(m.x, m.y, m.from === me.current ? '#ffe680' : '#7fd8ff');
          break;
        case 'paused':
          if (s) {
            s.remotePaused = m.on;
            s.pausedBy = m.on ? m.by : '';
            s.addMessage(m.on ? `${m.by} paused the battle.` : `${m.by} resumed the battle.`, 'info');
          }
          break;
        case 'note':
          s?.addMessage(m.text, 'info');
          setChat((l) => [...l.slice(-40), { from: 0, name: '', text: m.text }]);
          break;
        case 'ended':
          session.current?.stop();
          session.current = null;
          setInBattle(null);
          break;
        case 'error':
          setError(m.msg);
          break;
      }
    };
    c.connect();
    return () => {
      c.close();
      session.current?.stop();
      session.current = null;
    };
  }, [code]);

  const leave = (): void => {
    conn.current?.close();
    exit();
  };
  const isHost = !!lobby?.players.find((p) => p.id === me.current)?.host;

  if (inBattle) {
    return (
      <MpBattle
        session={inBattle}
        status={status}
        isHost={isHost}
        exit={leave}
        endBattle={() => conn.current?.send({ t: 'endBattle' })}
        chat={(text) => conn.current?.send({ t: 'chat', text })}
      />
    );
  }
  return (
    <Lobby
      lobby={lobby}
      me={me.current}
      status={status}
      error={error}
      chat={chat}
      send={(m) => conn.current?.send(m)}
      leave={leave}
    />
  );
}

function MpBattle({
  session,
  status,
  isHost,
  exit,
  endBattle,
  chat,
}: {
  session: GameSession;
  status: ConnStatus;
  isHost: boolean;
  exit: () => void;
  endBattle: () => void;
  chat: (text: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    session.mount(host.current!);
    return () => session.stop();
  }, [session]);
  return (
    <div className="battle">
      <div ref={host} style={{ position: 'absolute', inset: 0 }} />
      <Hud session={session} exit={exit} resultExit={isHost ? endBattle : undefined} chat={chat} />
      {status !== 'open' && (
        <div className="ff-window" style={{ position: 'absolute', top: 100, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
          Connection lost: reconnecting…
        </div>
      )}
    </div>
  );
}
