import { useState } from 'react';
import type { BattleSetup } from '@pl/sim';
import { Title } from '../ui/Title';
import { SoloSetup } from '../ui/SoloSetup';
import { BattleScreen } from '../ui/BattleScreen';
import { Help } from '../ui/Help';
import { Settings } from '../ui/Settings';
import { ArtPreview } from '../ui/ArtPreview';

export type Screen =
  | { k: 'title' }
  | { k: 'solo' }
  | { k: 'help' }
  | { k: 'settings' }
  | { k: 'battle'; setup: BattleSetup; playerId: number };

export function App() {
  const [screen, setScreen] = useState<Screen>({ k: 'title' });
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
    case 'battle':
      return <BattleScreen setup={screen.setup} playerId={screen.playerId} exit={() => setScreen({ k: 'title' })} />;
  }
}
