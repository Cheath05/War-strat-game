import { memo, useEffect, useRef, useState } from 'react';
import { ORDER_NAMES, TEAM_COLORS, recruitable, unitType, type DetOrder, type FormationKind } from '@pl/sim';
import { useStore } from '../app/store';
import type { GameSession } from '../game/session';
import type { DetCard, UnitCard } from '../game/hud';
import { UnitIcon } from './UnitIcon';
import { Minimap } from './Minimap';
import { loadGraphics } from '../game/render/quality';
import { SettingsBody } from './Settings';

const FORM_NAMES: Record<string, string> = {
  line: 'Line',
  loose: 'Loose',
  phalanx: 'Phalanx',
  testudo: 'Testudo',
  shieldwall: 'Shield wall',
  wedge: 'Wedge',
  column: 'Column',
};

const DET_ORDERS: DetOrder['k'][] = ['hold', 'advance', 'attack', 'flankL', 'flankR', 'skirmish', 'reserve', 'guard', 'retreat', 'none'];

const fmt = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function Hud({ session, exit, resultExit, chat }: { session: GameSession; exit: () => void; resultExit?: () => void; chat?: (text: string) => void }) {
  const h = useStore(session.hud, (s) => s);
  const [menu, setMenu] = useState<'' | 'menu' | 'settings'>('');
  // The results can be put aside to look over the field (and brought back).
  const [resultHidden, setResultHidden] = useState(false);
  const [typing, setTyping] = useState(false);
  const [line, setLine] = useState('');
  useEffect(() => {
    if (!chat) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Enter' && !typing && !(e.target as HTMLElement)?.closest?.('input')) {
        e.preventDefault();
        setTyping(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chat, typing]);
  const showFps = loadGraphics().showFps;
  if (!h.ok) return null;
  const myColor = h.sides[h.mySide]?.color ?? '#fff';
  const selectedUnits = h.dets.flatMap((d) => d.units).filter((u) => u.selected);
  return (
    <div className="hud">
      <div className="panel hud-top pl-hud-block">
        {h.sides.map((s, i) => (
          <div key={i} className="side-bar" style={{ order: i === 0 ? 0 : 2 }}>
            <span className="name" style={{ color: s.color }}>
              {s.name}
            </span>
            <div className="meter">
              <i style={{ width: `${(100 * s.alive) / Math.max(1, s.start)}%`, background: s.color }} />
            </div>
            <span className="dim">{s.alive}</span>
            {h.notes[i] && (
              <span className="gold" style={{ fontSize: 13 }}>
                {h.notes[i]}
              </span>
            )}
          </div>
        ))}
        <div className="hud-clock" style={{ order: 1 }}>
          {h.phase === 'deploy' ? `${h.deployLeft}s` : fmt(h.time)}
        </div>
      </div>
      <div className="hud-menu pl-hud-block">
        {h.paused && <span className="panel hud-tag">Paused{h.pausedBy ? ` by ${h.pausedBy}` : ''}</span>}
        <button className="btn small" onClick={() => setMenu('menu')}>
          Menu
        </button>
      </div>
      {showFps && (
        <div className="panel fps">
          {h.fps} fps · behind {h.backlog}
        </div>
      )}
      <div className="hud-msgs">
        {h.messages.map((m) => (
          <div key={m.id} className={`panel msg ${m.tone}`}>
            {m.text}
          </div>
        ))}
      </div>
      {h.phase === 'deploy' && (
        <div className="panel hud-banner pl-hud-block">
          <span>
            Deployment <span className="dim">· right-drag to place your units in the golden zone</span>
          </span>
          <button className={`btn ${h.ready ? 'on' : 'primary'}`} onClick={() => session.issue({ k: 'ready', on: !h.ready })}>
            {h.ready ? 'Waiting…' : 'Ready for battle'}
          </button>
        </div>
      )}
      {h.waiting && h.phase !== 'ended' && (
        <div className="panel hud-banner">{h.waiting}</div>
      )}
      {h.myOrder && h.phase === 'battle' && (
        <div className="panel hud-banner">
          <span>
            <span className="dim">Orders from {h.myOrder.from}:</span> <span className="gold">{h.myOrder.text}</span>
            <span className="dim"> · how you carry them out is up to you</span>
          </span>
        </div>
      )}
      {h.orderMode && (
        <div className="panel hud-banner order-hint">
          Click on the map: {ORDER_NAMES[h.orderMode as DetOrder['k']]} <span className="dim">(right click to cancel)</span>
        </div>
      )}
      {h.possessed && (
        <div className="panel possess-hud pl-hud-block">
          <div>
            <span className="gold">♛ Leading the {h.possessed.name}</span>
            {h.possessed.hold && <span className="dim"> · holding</span>}
          </div>
          <div className="keys">
            <span>
              <span className="kbd">WASD</span>move
            </span>
            <span>
              <span className="kbd">Space</span>charge
            </span>
            <span>
              <span className="kbd">R</span>rally
            </span>
            <span>
              <span className="kbd">Q</span>volley
            </span>
            <span>
              <span className="kbd">E</span>hold
            </span>
            <span>
              <span className="kbd">F</span>formation
            </span>
            <span>
              <span className="kbd">Tab</span>back
            </span>
          </div>
        </div>
      )}
      {h.goldMode && h.phase === 'battle' && <GoldBox session={session} />}
      <Minimap session={session} />
      {typing && chat && (
        <div className="panel chat-line pl-hud-block">
          <input
            className="field"
            autoFocus
            style={{ width: '100%' }}
            value={line}
            maxLength={200}
            placeholder="Say to everyone… (Enter to send, Esc to cancel)"
            onChange={(e) => setLine(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                if (line.trim()) chat(line.trim());
                setLine('');
                setTyping(false);
              } else if (e.key === 'Escape') {
                setLine('');
                setTyping(false);
              }
            }}
          />
        </div>
      )}
      {selectedUnits.length > 0 && !h.possessed && <OrdersPanel session={session} units={selectedUnits} />}
      <div className="hud-bottom pl-hud-block">
        {h.dets.map((d) => (
          <DetPanel key={d.id} d={d} session={session} color={myColor} isGeneral={h.role === 'general'} />
        ))}
      </div>
      {h.result && !resultHidden && <Result session={session} exit={exit} resultExit={resultExit} hide={() => setResultHidden(true)} />}
      {h.result && resultHidden && (
        <div className="panel hud-banner pl-hud-block">
          <span className={h.result.winner < 0 ? '' : h.result.mine ? 'gold' : 'bad'}>{h.result.winner < 0 ? 'Draw' : h.result.mine ? 'Victory' : 'Defeat'}</span>
          <span className="dim">· the battle is over</span>
          <button className="btn small primary" onClick={() => setResultHidden(false)}>
            Show results
          </button>
        </div>
      )}
      {menu === 'menu' && (
        <div className="overlay pl-hud-block" onClick={() => setMenu('')}>
          <div className="panel battle-menu" onClick={(e) => e.stopPropagation()}>
            <h2 className="heading">Battle menu</h2>
            <button className="btn primary" onClick={() => setMenu('')}>
              Resume
            </button>
            <button className="btn" onClick={() => session.togglePause()}>
              {h.paused ? 'Unpause' : 'Pause'}
            </button>
            {h.role !== 'spectator' && (
              <button className={`btn ${h.auto ? 'on' : ''}`} onClick={() => session.issue({ k: 'auto', on: !h.auto })} title="The AI general and commanders lead your troops until you take them back">
                Let the AI lead my troops: {h.auto ? 'on' : 'off'}
              </button>
            )}
            <button className="btn" onClick={() => setMenu('settings')}>
              Settings
            </button>
            <button className="btn" onClick={exit}>
              {session.multiplayer ? 'Leave the room' : 'Leave battle'}
            </button>
          </div>
        </div>
      )}
      {menu === 'settings' && (
        <div className="overlay pl-hud-block" onClick={() => setMenu('')}>
          <div className="window settings" onClick={(e) => e.stopPropagation()}>
            <header className="window-head">
              <h2 className="heading">Settings</h2>
              <button className="btn small ghost" onClick={() => setMenu('menu')}>
                Back
              </button>
            </header>
            <div className="window-body">
              <SettingsBody onGraphics={(g) => session.applyGraphics(g)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DetPanel = memo(function DetPanel({ d, session, color, isGeneral }: { d: DetCard; session: GameSession; color: string; isGeneral: boolean }) {
  return (
    <div className="panel det">
      <div className="det-head">
        <b>{d.name}</b>
        <span>· {d.commander}</span>
        {!d.guard && d.order !== 'none' && <span>· {ORDER_NAMES[d.order as DetOrder['k']]}</span>}
        {isGeneral && !d.guard && <DetOrderMenu session={session} det={d.id} />}
      </div>
      <div className="det-cards">
        {d.units.map((u) => (
          <Card key={u.id} u={u} session={session} color={color} />
        ))}
      </div>
    </div>
  );
});

function DetOrderMenu({ session, det }: { session: GameSession; det: number }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative' }}>
      <button className={`btn small ${open ? 'on' : ''}`} onClick={() => setOpen(!open)} title="Give this detachment's commander an order">
        Orders
      </button>
      {open && (
        <div className="panel col" style={{ position: 'absolute', bottom: 32, left: 0, zIndex: 20, minWidth: 170, padding: 6, gap: 3 }}>
          {DET_ORDERS.map((k) => (
            <button
              key={k}
              className="btn small"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => {
                setOpen(false);
                session.input?.detOrder(det, k);
              }}
            >
              {ORDER_NAMES[k]}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

function Card({ u, session, color }: { u: UnitCard; session: GameSession; color: string }) {
  const click = (e: React.MouseEvent): void => {
    session.input?.select([u.id], e.shiftKey || e.ctrlKey || e.metaKey);
  };
  const dbl = (): void => session.input?.centerOn([u.id]);
  const army = session.me ? session.battle.army(session.me.army) : undefined;
  return (
    <div
      className={`ucard ${u.selected ? 'sel' : ''} ${u.morale} ${unitType(u.type).elite ? 'elite' : ''}`}
      onClick={click}
      onDoubleClick={dbl}
      title={`${u.name}: ${u.n}/${u.max} men, ${u.order}, ${u.morale}${u.fat > 45 ? ', tired' : ''}`}
    >
      <UnitIcon type={u.type} pal={army?.pal ?? 0} />
      {u.maxAmmo > 0 && <span className="ammo">{u.ammo}</span>}
      {u.group > 0 && <span className="badge">{u.group}</span>}
      {u.led && (
        <span className="badge" style={{ left: 3, right: 'auto', top: 14 }}>
          ♛
        </span>
      )}
      <div className="nm">{u.name}</div>
      <div className="str">
        <i style={{ width: `${(100 * u.n) / Math.max(1, u.max)}%`, background: color }} />
      </div>
      <div className="fat">
        <i style={{ width: `${100 - u.fat}%` }} />
      </div>
    </div>
  );
}

/** Gold and reinforcements (gold modes): new units march in from our map edge. */
function GoldBox({ session }: { session: GameSession }) {
  const h = useStore(session.hud, (s) => s);
  const [open, setOpen] = useState(false);
  return (
    <div className="panel gold-box pl-hud-block">
      <div className="row" style={{ gap: 10 }}>
        <span>
          <span className="dim">Gold</span> <span className="gold">{h.gold}</span>
        </span>
        <button className={`btn small ${open ? 'on' : ''}`} onClick={() => setOpen(!open)}>
          Reinforce
        </button>
      </div>
      {open && (
        <div className="col" style={{ gap: 3, marginTop: 6 }}>
          <span className="dim" style={{ fontSize: 12 }}>
            {h.armyFull ? 'Your army is at full strength in units.' : 'New units march in from your map edge.'}
          </span>
          {recruitable(h.faction).map((t) => (
            <button key={t.id} className="btn small recruit-row" disabled={h.armyFull || t.cost > h.gold} title={t.desc} onClick={() => session.issue({ k: 'recruit', t: t.id })}>
              <UnitIcon type={t.id} pal={h.pal} />
              <span style={{ flex: 1, textAlign: 'left' }}>{t.name}</span>
              <span className="gold">{t.cost}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OrdersPanel({ session, units }: { session: GameSession; units: UnitCard[] }) {
  const h = useStore(session.hud, (s) => s);
  const first = units[0]!;
  const ids = units.map((u) => u.id);
  // Refilling worn units (gold modes): price per man, a quarter above the unit's own.
  const worn = units.filter((u) => u.n < u.max);
  const refill = worn.reduce((s, u) => {
    const t = session.battle.typeOf(session.battle.unit(u.id)!);
    return s + (u.max - u.n) * Math.ceil((t.cost / Math.max(1, t.size)) * 1.25);
  }, 0);
  const real = (): import('@pl/sim').Unit[] => ids.map((id) => session.battle.unit(id)!).filter(Boolean);
  const forms = first.forms;
  return (
    <div className="panel hud-orders pl-hud-block">
      <div className="title">
        {units.length === 1 ? first.name : `${units.length} units`}
        <span className="dim" style={{ fontSize: 12 }}>
          {' '}
          · {first.order}
        </span>
      </div>
      <div className="grid">
        {forms.map((f) => (
          <button key={f} className={`btn small ${first.form === f ? 'on' : ''}`} onClick={() => session.input?.setFormation(real(), f as FormationKind)}>
            {FORM_NAMES[f]}
          </button>
        ))}
      </div>
      <div className="grid">
        <button className="btn small" onClick={() => session.issue({ k: 'halt', u: ids })}>
          Halt (H)
        </button>
        <button className={`btn small ${first.flags & 4 ? 'on' : ''}`} onClick={() => session.issue({ k: 'flag', u: ids, f: 'guard', on: !(first.flags & 4) })}>
          Guard (G)
        </button>
        {first.maxAmmo > 0 && (
          <>
            <button className={`btn small ${first.flags & 1 ? 'on' : ''}`} onClick={() => session.issue({ k: 'flag', u: ids, f: 'fire', on: !(first.flags & 1) })}>
              Fire at will (T)
            </button>
            <button className={`btn small ${first.flags & 2 ? 'on' : ''}`} onClick={() => session.issue({ k: 'flag', u: ids, f: 'skirmish', on: !(first.flags & 2) })}>
              Skirmish (K)
            </button>
          </>
        )}
        {units.length === 1 && first.officer > 0 && (
          <button className="btn small" onClick={() => session.input?.possessUnit(first.id)} title="Take command of this unit's officer yourself">
            ♛ Lead (P)
          </button>
        )}
        {first.abilities.map((a) => (
          <button key={a.id} className="btn small" disabled={!a.ready} onClick={() => session.issue({ k: 'ability', u: first.id, a: a.id })}>
            {a.name}
            {!a.ready ? ` ${a.cd}s` : ''}
          </button>
        ))}
        {h.goldMode && worn.length > 0 && (
          <button
            className="btn small"
            title="Fresh men for worn units out of combat, near your General or your map edge. Buys as many as your gold allows."
            onClick={() => worn.forEach((u) => session.issue({ k: 'replenish', u: u.id }))}
          >
            Replenish ({refill} gold)
          </button>
        )}
      </div>
    </div>
  );
}

function Result({ session, exit, resultExit, hide }: { session: GameSession; exit: () => void; resultExit?: () => void; hide: () => void }) {
  const h = useStore(session.hud, (s) => s);
  const b = session.battle;
  const r = h.result!;
  const ref = useRef(false);
  useEffect(() => {
    ref.current = true;
  }, []);
  const best = [...b.world.units].sort((x, y) => y.kills - x.kills)[0];
  return (
    <div className="overlay pl-hud-block">
      <div className="panel result">
        <h1 className={`big ${r.winner < 0 ? 'draw' : r.mine ? 'win' : 'lose'}`}>{r.winner < 0 ? 'Draw' : r.mine ? 'Victory' : 'Defeat'}</h1>
        <div className="dim">{r.reason}</div>
        {b.scenario.waves && (
          <div style={{ margin: '6px 0', fontSize: 18 }}>
            Waves beaten: <span className="gold">{b.world.sides[0]!.score}</span> of {b.scenario.waves.count}
          </div>
        )}
        {h.notes.some(Boolean) && !b.scenario.waves && (
          <div style={{ margin: '6px 0' }}>
            Victory points: {b.world.sides.map((s) => `${s.name} ${s.score}`).join(' · ')}
          </div>
        )}
        <div className="stats">
          <b>Army</b>
          <b>Kills</b>
          <b>Losses</b>
          <b>General</b>
          {b.world.armies.map((a) => (
            <ArmyRow key={a.id} name={`${a.name} (${a.title})`} color={`#${TEAM_COLORS[a.pal]!.primary.toString(16).padStart(6, '0')}`} kills={a.kills} losses={a.losses} dead={a.genDead} />
          ))}
        </div>
        {best && (
          <div style={{ margin: '8px 0' }}>
            Most valiant: <span className="gold">{b.typeOf(best).name}</span> of {b.army(best.army)?.title} with {best.kills} kills
          </div>
        )}
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={hide} title="Hide this and look over the battlefield">
            View the battlefield
          </button>
          {!session.multiplayer && (
            <button className="btn primary" onClick={exit}>
              Back to the menu
            </button>
          )}
          {session.multiplayer && resultExit && (
            <button className="btn primary" onClick={resultExit}>
              Back to the lobby
            </button>
          )}
          {session.multiplayer && !resultExit && <span className="dim">Waiting for the host to return to the lobby…</span>}
          {session.multiplayer && (
            <button className="btn" onClick={exit}>
              Leave the room
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ArmyRow({ name, color, kills, losses, dead }: { name: string; color: string; kills: number; losses: number; dead: boolean }) {
  return (
    <>
      <span style={{ color }}>{name}</span>
      <span>{kills}</span>
      <span>{losses}</span>
      <span className="dim">{dead ? 'fell' : 'lives'}</span>
    </>
  );
}
