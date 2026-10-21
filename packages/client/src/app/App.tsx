import { useEffect, useState } from 'react';
import { music } from '../audio/music';
import type { BattleSetup } from '@pl/sim';
import { Title } from '../ui/Title';
import { SoloSetup } from '../ui/SoloSetup';
import { BattleScreen } from '../ui/BattleScreen';
import { Help } from '../ui/Help';
import { Settings } from '../ui/Settings';
import { ArtPreview } from '../ui/ArtPreview';
import { Room } from '../ui/Room';

export type Screen =
  | { k: 'title' }
  | { k: 'solo' }
  | { k: 'help' }
  | { k: 'settings' }
  | { k: 'room'; code: string }
  | { k: 'battle'; setup: BattleSetup; playerId: number };

/** A link like https://…/#join=ABCD drops a friend straight into the room after their name. */
export function inviteCode(): string {
  const m = /#join=([A-Za-z]{4})/.exec(location.hash);
  return m ? m[1]!.toUpperCase() : '';
}

export function App() {
  const [screen, setScreen] = useState<Screen>({ k: 'title' });
  // The menus have their own theme; rooms and battles choose their music themselves.
  useEffect(() => {
    if (screen.k !== 'battle' && screen.k !== 'room') music.play('title');
  }, [screen.k]);
  if (location.hash === '#art') return <ArtPreview />;
  switch (screen.k) {
    case 'title':
      return <Title go={setScreen} />;
    case 'solo':
      return <SoloSetup go={setScreen} />;
    case 'help':
      return <Help back={() => setScreen({ k: 'title' })} />;
    case 'settings':
      return <Settings back={() => setScreen({ k: 'title' })} />;
    case 'room':
      return (
        <Room
          code={screen.code}
          exit={() => {
            history.replaceState(null, '', location.pathname);
            setScreen({ k: 'title' });
          }}
        />
      );
    case 'battle':
      return <BattleScreen setup={screen.setup} playerId={screen.playerId} exit={() => setScreen({ k: 'title' })} />;
  }
}
