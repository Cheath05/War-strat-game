import { useState } from 'react';
import { budgetFor, faction, listScenarios, scenarioDef, unitType, type Settings } from '@pl/sim';
import { RecruitPanel, ScenarioOptions } from './Recruit';
import type { C2S, LobbyState } from '@pl/net';
import type { ConnStatus } from '../net/connection';

export interface ChatLine {
  from: number;
  name: string;
  text: string;
}

const SIZES = [
  { v: 0.5, name: 'Small' },
  { v: 1, name: 'Medium' },
  { v: 1.5, name: 'Large' },
  { v: 2, name: 'Huge' },
];
const DIFFS = ['Easy', 'Normal', 'Hard', 'Legendary'];

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
  if (!lobby) {
    return (
      <div className="screen title-bg">
        <div className="ff-window" style={{ position: 'relative', zIndex: 1 }}>
          {error ? <p>{error}</p> : <p className="loading">{status === 'reconnecting' ? 'Reconnecting…' : 'Joining the room…'}</p>}
          <button className="ff-btn" onClick={leave}>
            Back
          </button>
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
    <div className="screen title-bg">
      <div className="ff-window setup" style={{ position: 'relative', zIndex: 1, width: 'min(98vw, 1100px)' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <h2 className="ff-title" style={{ margin: 0 }}>
              Room {lobby.code}
            </h2>
            <button className="ff-btn small" onClick={copy} title={link}>
              {copied ? 'Link copied!' : 'Copy invite link'}
            </button>
            {status !== 'open' && <span className="dim">reconnecting…</span>}
          </div>
          <button className="ff-btn small" onClick={leave}>
            Leave room
          </button>
        </div>
        {error && <p style={{ color: 'var(--bad)' }}>{error}</p>}

        <section>
          <div className="dim">Battle {host ? '' : '(the host chooses)'}</div>
          <div className="panel-list">
            {listScenarios()
              .filter((x) => !x.hidden)
              .map((x) => (
                <div
                  key={x.id}
                  className={`ff-window choice ${x.id === lobby.scenario ? 'on' : ''}`}
                  onClick={() => host && send({ t: 'lobby', op: 'scenario', id: x.id })}
                  style={{ cursor: host ? 'pointer' : 'default' }}
                >
                  <h3>
                    {x.name} {x.year ? <span className="dim">({x.year})</span> : null}
                  </h3>
                  <p>{x.blurb}</p>
                </div>
              ))}
          </div>
          <ScenarioOptions sc={raw} choices={lobby.options} onChange={host ? (c) => send({ t: 'lobby', op: 'options', options: c }) : undefined} />
        </section>

        <section>
          <div className="dim">Armies: lead one as General, or serve a General as one of their Commanders. Empty places are led by the AI.</div>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            {sc.sides.map((side, si) => (
              <div key={si} className="col" style={{ flex: 1, minWidth: 300 }}>
                <div className="ff-title" style={{ fontSize: 18 }}>
                  {side.name} <span className="dim">· {side.role}</span>
                </div>
                {side.aiOnly && (
                  <div className="ff-window" style={{ padding: '8px 10px' }}>
                    {sc.waves ? `${sc.waves.count} waves of ${faction(side.faction).name}, each bigger than the last.` : 'Led by the AI.'} <span className="dim">Only the AI plays this side.</span>
                  </div>
                )}
                {side.slots
                  .filter(() => !side.aiOnly)
                  .map((sl) => {
                    const general = players.find((p) => p.role === 'general' && p.slot === sl.key);
                    const recruited = unitsOf(sl.key);
                    return (
                      <div key={sl.key} className="ff-window" style={{ padding: '8px 10px' }}>
                        <div className="row" style={{ justifyContent: 'space-between' }}>
                          <span>
                            <b style={{ color: 'var(--gold)' }}>{sl.name}</b> <span className="dim">· {sl.title}</span> {sl.reserve && <span className="tag">arrives mid-battle</span>}
                          </span>
                          <span className="dim" style={{ fontSize: 12 }}>
                            {faction(sl.faction).name}
                          </span>
                        </div>
                        <div className="row" style={{ marginTop: 4 }}>
                          <span>General: {general ? <b>{general.name}</b> : <span className="dim">AI</span>}</span>
                          {!general && (
                            <button className="ff-btn small" onClick={() => send({ t: 'lobby', op: 'claim', role: 'general', slot: sl.key, det: 0 })}>
                              Lead this army
                            </button>
                          )}
                          {general?.id === me && myBudget > 0 && (
                            <button className="ff-btn small" onClick={() => setRecruiting(true)}>
                              Recruit army
                            </button>
                          )}
                          {recruited && <span className="tag">recruited</span>}
                        </div>
                        <div className="col" style={{ gap: 3, marginTop: 4 }}>
                          {detsOf(sl.key, sl.dets).map((d, i) => {
                            const cmd = players.find((p) => p.role === 'commander' && p.slot === sl.key && p.det === i);
                            return (
                              <div key={i} className="row" style={{ fontSize: 13, gap: 6 }}>
                                <span className="dim">{d.name}:</span>
                                <span style={{ flex: 1 }}>{summary(d.units)}</span>
                                {cmd ? (
                                  <b>{cmd.name}</b>
                                ) : (
                                  <button className="ff-btn small" onClick={() => send({ t: 'lobby', op: 'claim', role: 'commander', slot: sl.key, det: i })}>
                                    Command
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </section>

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <section style={{ flex: 1, minWidth: 300 }}>
            <div className="dim">Rules {host ? '' : '(the host sets these)'}</div>
            <div className="row">
              {(['morale', 'fatigue', 'ammo', 'fog'] as const).map((k) => (
                <button key={k} disabled={!host} className={`ff-btn small ${s[k] ? 'on' : ''}`} onClick={() => setRule({ [k]: !s[k] })}>
                  {k === 'morale' ? 'Morale' : k === 'fatigue' ? 'Fatigue' : k === 'ammo' ? 'Limited ammo' : 'Fog of war'}: {s[k] ? 'on' : 'off'}
                </button>
              ))}
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <span className="dim">Unit size</span>
              {SIZES.map((z) => (
                <button key={z.v} disabled={!host} className={`ff-btn small ${s.unitSize === z.v ? 'on' : ''}`} onClick={() => setRule({ unitSize: z.v })}>
                  {z.name}
                </button>
              ))}
            </div>
            <div className="row" style={{ marginTop: 6 }}>
              <span className="dim">AI</span>
              {DIFFS.map((d, i) => (
                <button key={d} disabled={!host} className={`ff-btn small ${s.difficulty === i ? 'on' : ''}`} onClick={() => setRule({ difficulty: i })}>
                  {d}
                </button>
              ))}
            </div>
          </section>

          <section style={{ width: 340 }}>
            <div className="dim">Players</div>
            <div className="col" style={{ gap: 3 }}>
              {players.map((p) => (
                <div key={p.id} className="row" style={{ gap: 6, opacity: p.connected ? 1 : 0.5 }}>
                  <span>{p.host ? '★' : '·'}</span>
                  <b style={{ color: p.id === me ? 'var(--gold)' : undefined }}>{p.name}</b>
                  <span className="dim" style={{ flex: 1 }}>
                    {p.role === 'spectator' ? 'watching' : p.role === 'general' ? `General of ${slotName(sc, p.slot)}` : `Commander under ${slotName(sc, p.slot)}`}
                  </span>
                  <span style={{ color: p.ready ? 'var(--good)' : 'var(--text-dim)' }}>{p.ready ? 'ready' : '…'}</span>
                </div>
              ))}
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className={`ff-btn small ${self?.ready ? 'on' : ''}`} onClick={() => send({ t: 'lobby', op: 'ready', on: !self?.ready })}>
                {self?.ready ? 'Ready!' : 'Ready?'}
              </button>
              <button className="ff-btn small" onClick={() => send({ t: 'lobby', op: 'claim', role: 'spectator', slot: '', det: 0 })}>
                Just watch
              </button>
              {host && (
                <button className="ff-btn" onClick={() => send({ t: 'lobby', op: 'start' })} title={allReady ? '' : 'Not everyone is ready, but you can start anyway'}>
                  Start battle{allReady ? '' : ' anyway'}
                </button>
              )}
            </div>
          </section>
        </div>

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

        <section>
          <div className="dim">Chat</div>
          <div className="ff-window" style={{ maxHeight: 120, overflow: 'auto', fontSize: 13, padding: '6px 10px' }}>
            {chat.length === 0 && <span className="dim">Share the room code {lobby.code} with your friends.</span>}
            {chat.map((c, i) => (
              <div key={i}>{c.from ? <b>{c.name}: </b> : <span className="dim">· </span>}{c.text}</div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <input className="ff-input" style={{ flex: 1 }} value={msg} maxLength={200} placeholder="Say something…" onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sayChat()} />
            <button className="ff-btn small" onClick={sayChat}>
              Send
            </button>
          </div>
        </section>
      </div>
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
