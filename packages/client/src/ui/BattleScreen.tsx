import { useEffect, useRef, useState } from 'react';
import { Battle, type BattleSetup } from '@pl/sim';
import { GameSession } from '../game/session';
import { loadGraphics } from '../game/render/quality';
import { sharedArt } from '../game/render/BattleRenderer';
import { Hud } from './Hud';

/** Hosts a solo battle: builds it, mounts the renderer, overlays the HUD. */
export function BattleScreen({ setup, playerId, exit }: { setup: BattleSetup; playerId: number; exit: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let s: GameSession | null = null;
    // Let the "preparing" text paint before the (synchronous) art generation.
    const id = setTimeout(() => {
      try {
        sharedArt();
        const battle = Battle.create(setup);
        s = new GameSession(battle, { playerId, graphics: loadGraphics() });
        s.mount(host.current!);
        setSession(s);
      } catch (e) {
        console.error(e);
        setError(String(e));
      }
    }, 30);
    return () => {
      clearTimeout(id);
      s?.stop();
    };
  }, [setup, playerId]);

  return (
    <div className="battle">
      <div ref={host} style={{ position: 'absolute', inset: 0 }} />
      {!session && !error && (
        <div className="overlay">
          <div className="loading">Preparing the battlefield</div>
        </div>
      )}
      {error && (
        <div className="overlay">
          <div className="panel col" style={{ gap: 12 }}>
            <div>Something went wrong: {error}</div>
            <button className="btn" onClick={exit}>
              Back
            </button>
          </div>
        </div>
      )}
      {session && <Hud session={session} exit={exit} />}
    </div>
  );
}
