import { useEffect, useRef, useState } from 'react';
import { budgetFor, faction, listScenarios, scenarioDef, unitType, type Settings } from '@pl/sim';
import { RecruitPanel } from './Recruit';
import { RulesEditor, ScenarioOptions } from './Rules';
import { Backdrop } from './Backdrop';
import { VersionBadge } from './Version';
import type { C2S, LobbyState } from '@pl/net';
import type { ConnStatus } from '../net/connection';

export interface ChatLine {
  from: number;
  name: string;
  text: string;
}

/** The room before battle: pick sides and roles, set the rules, chat, ready up. */
export function Lobby({
  lobby,
  me,
  status,
  error,
  chat,
  send,
  leave,
}: {
  lobby: LobbyState | null;
  me: number;
  status: ConnStatus;
  error: string;
  chat: ChatLine[];
  send: (m: C2S) => void;
  leave: () => void;
}) {
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [recruiting, setRecruiting] = useState(false);
  // Keep the newest chat line in view.
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    log.current?.scrollTo(0, log.current.scrollHeight);
  }, [chat.length]);
  if (!lobby) {
    return (
      <div className="screen">
        <Backdrop dim />
        <div className="window" style={{ width: 'min(92vw, 420px)' }}>
          <div className="window-body col" style={{ gap: 16 }}>
            {error ? <div className="notice bad">{error}</div> : <div className="loading">{status === 'reconnecting' ? 'Reconnecting' : 'Joining the room'}</div>}
            <div>
              <button className="btn" onClick={leave}>
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const sc = scenarioDef(lobby.scenario, lobby.options);
  const raw = listScenarios().find((x) => x.id === lobby.scenario) ?? sc;
  const self = lobby.players.find((p) => p.id === me);
  // The units of a slot's army: recruited in this lobby, or the scenario's own.
  const unitsOf = (slot: string): string[] | undefined => lobby.armies.find((a) => a.slot === slot)?.dets.flatMap((d) => d.units);
  const detsOf = (slot: string, fallback: { name: string; units: string[] }[]): { name: string; units: string[] }[] => lobby.armies.find((a) => a.slot === slot)?.dets ?? fallback;
  const mySlot = self?.role === 'general' ? sc.sides.flatMap((x, si) => x.slots.map((sl) => ({ sl, si }))).find((x) => x.sl.key === self.slot) : undefined;
  const myBudget = mySlot ? budgetFor(sc, mySlot.si) : 0;
  const host = !!self?.host;
  const s = lobby.settings;
  const setRule = (p: Partial<Settings>): void => send({ t: 'lobby', op: 'settings', settings: { ...s, ...p } });
  const players = lobby.players;
  const fighters = players.filter((p) => p.role !== 'spectator' && p.connected);
  const allReady = fighters.length > 0 && fighters.every((p) => p.ready || p.id === me);
  const link = `${location.origin}/#join=${lobby.code}`;
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  const sayChat = (): void => {
    if (msg.trim()) send({ t: 'chat', text: msg.trim() });
    setMsg('');
  };

  return (
    <div className="screen">
      <Backdrop dim />
      <div className="window lobby">
        <header className="window-head">
          <div className="row" style={{ gap: 14 }}>
            <h2 className="heading">
              Room <span className="room-code">{lobby.code}</span>
            </h2>
            <button className="btn small" onClick={copy} title={link}>
              {copied ? 'Link copied' : 'Copy invite link'}
            </button>
            {status !== 'open' && <span className="dim">reconnecting…</span>}
          </div>
          <button className="btn small ghost" onClick={leave}>
            Leave room
          </button>
        </header>
        <div className="window-body">
          {error && (
            <div className="notice bad" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}
          <div className="lobby-grid">
            <div>
              <section>
                <div className="label">Battle{host ? '' : ' · the host chooses'}</div>
                <div className="panel-list">
                  {listScenarios()
                    .filter((x) => !x.hidden)
                    .map((x) => (
                      <div
                        key={x.id}
                        className={`choice ${x.id === lobby.scenario ? 'on' : ''}`}
                        onClick={() => host && send({ t: 'lobby', op: 'scenario', id: x.id })}
                        style={{ cursor: host ? 'pointer' : 'default' }}
                      >
                        <h3>
                          {x.name} {x.year ? <span className="dim">{x.year}</span> : null}
                        </h3>
                        <p>{x.blurb}</p>
                      </div>
                    ))}
                </div>
                <ScenarioOptions sc={raw} choices={lobby.options} onChange={host ? (c) => send({ t: 'lobby', op: 'options', options: c }) : undefined} />
              </section>

              <section>
                <div className="label">Armies</div>
                <p className="hint">Lead an army as General, or serve its General as one of their Commanders. Empty places are led by the AI.</p>
                <div className="sides">
                  {sc.sides.map((side, si) => (
                    <div key={si} className="col">
                      <div className="side-head">
                        {side.name} <span className="dim">{side.role}</span>
                      </div>
                      {side.aiOnly && (
                        <div className="slot dim">
                          {sc.waves ? `${sc.waves.count} waves of ${faction(side.faction).name}, each bigger than the last.` : 'Led by the AI.'} Only the AI plays this side.
                        </div>
                      )}
                      {side.slots
                        .filter(() => !side.aiOnly)
                        .map((sl) => {
                          const general = players.find((p) => p.role === 'general' && p.slot === sl.key);
                          const recruited = unitsOf(sl.key);
                          return (
                            <div key={sl.key} className="slot">
                              <div className="slot-head">
                                <span>
                                  {sl.name} <span className="dim">· {sl.title}</span> {sl.reserve && <span className="tag">arrives mid-battle</span>}
                                </span>
                                <span className="dim" style={{ fontSize: 12 }}>
                                  {faction(sl.faction).name}
                                </span>
                              </div>
                              <div className="slot-line">
                                <span className="dim">General</span>
                                {general ? <b>{general.name}</b> : <span className="dim">AI</span>}
                                {recruited && <span className="tag">recruited</span>}
                                <span style={{ flex: 1 }} />
                                {general?.id === me && myBudget > 0 && (
                                  <button className="btn small" onClick={() => setRecruiting(true)}>
                                    Recruit army
                                  </button>
                                )}
                                {!general && (
                                  <button className="btn small" onClick={() => send({ t: 'lobby', op: 'claim', role: 'general', slot: sl.key, det: 0 })}>
                                    Lead this army
                                  </button>
                                )}
                              </div>
                              {detsOf(sl.key, sl.dets).map((d, i) => {
                                const cmd = players.find((p) => p.role === 'commander' && p.slot === sl.key && p.det === i);
                                return (
                                  <div key={i} className="det-row">
                                    <span className="dim">{d.name}</span>
                                    <span className="units">{summary(d.units)}</span>
                                    {cmd ? (
                                      <b>{cmd.name}</b>
                                    ) : (
                                      <button className="btn small" onClick={() => send({ t: 'lobby', op: 'claim', role: 'commander', slot: sl.key, det: i })}>
                                        Command
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="label">Rules{host ? '' : ' · the host sets these'}</div>
                <RulesEditor sc={sc} settings={s} onChange={host ? setRule : undefined} />
              </section>
            </div>

            <aside className="lobby-aside">
              <section>
                <div className="label">Players</div>
                {players.map((p) => (
                  <div key={p.id} className="player" style={{ opacity: p.connected ? 1 : 0.5 }}>
                    <span className={`lamp ${p.ready ? 'on' : ''}`} title={p.ready ? 'Ready' : 'Not ready yet'} />
                    <div className="who">
                      <span className={p.id === me ? 'gold' : undefined}>{p.name}</span>
                      {p.host && <span className="tag">host</span>}
                      <span className="role">
                        {p.role === 'spectator' ? 'Watching' : p.role === 'general' ? `General of ${slotName(sc, p.slot)}` : `Commander under ${slotName(sc, p.slot)}`}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="row" style={{ marginTop: 12, gap: 6 }}>
                  <button className={`btn small ${self?.ready ? 'on' : ''}`} onClick={() => send({ t: 'lobby', op: 'ready', on: !self?.ready })}>
                    {self?.ready ? 'Ready!' : 'Ready?'}
                  </button>
                  <button className="btn small ghost" onClick={() => send({ t: 'lobby', op: 'claim', role: 'spectator', slot: '', det: 0 })}>
                    Just watch
                  </button>
                </div>
                {host && (
                  <button
                    className="btn primary big"
                    style={{ width: '100%', marginTop: 12 }}
                    onClick={() => send({ t: 'lobby', op: 'start' })}
                    title={allReady ? '' : 'Not everyone is ready, but you can start anyway'}
                  >
                    Start battle{allReady ? '' : ' anyway'}
                  </button>
                )}
              </section>

              <section>
                <div className="label">Chat</div>
                <div className="chat-log" ref={log}>
                  {chat.length === 0 && <span className="dim">Share the room code {lobby.code} with your friends.</span>}
                  {chat.map((c, i) => (
                    <div key={i}>
                      {c.from ? <span className="gold">{c.name}: </span> : <span className="dim">· </span>}
                      {c.text}
                    </div>
                  ))}
                </div>
                <div className="row" style={{ marginTop: 6, gap: 6, flexWrap: 'nowrap' }}>
                  <input className="field" style={{ flex: 1, padding: '6px 10px', fontSize: 14 }} value={msg} maxLength={200} placeholder="Say something…" onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sayChat()} />
                  <button className="btn small" onClick={sayChat}>
                    Send
                  </button>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
      <VersionBadge />
      {recruiting && mySlot && (
        <RecruitPanel
          title={`${mySlot.sl.name}, ${mySlot.sl.title}`}
          factionId={mySlot.sl.faction}
          budget={myBudget}
          maxUnits={sc.recruit?.maxUnits ?? 12}
          units={unitsOf(mySlot.sl.key) ?? mySlot.sl.dets.flatMap((d) => d.units)}
          pal={mySlot.si === 0 ? 0 : 2}
          onChange={(units) => send({ t: 'lobby', op: 'army', units })}
          onClose={() => setRecruiting(false)}
        />
      )}
    </div>
  );
}

function slotName(sc: ReturnType<typeof scenarioDef>, key: string): string {
  const sl = sc.sides.flatMap((s) => s.slots).find((x) => x.key === key);
  return sl ? sl.name : key;
}

function summary(types: string[]): string {
  const counts = new Map<string, number>();
  for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].map(([t, n]) => `${n > 1 ? `${n}× ` : ''}${unitType(t).name}`).join(', ');
}
