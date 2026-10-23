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
import { VersionBadge } from '../ui/Version';
import { CampaignSelect } from '../ui/campaign/CampaignSelect';
import { CampaignMap } from '../ui/campaign/CampaignMap';
import { Camp } from '../ui/campaign/Camp';
import { CampaignBattle } from '../ui/campaign/CampaignBattle';
import { Rewards } from '../ui/campaign/Rewards';
import type { Outcome } from './campaign';

export type Screen =
  | { k: 'title' }
  | { k: 'solo' }
  | { k: 'help' }
  | { k: 'settings' }
  | { k: 'room'; code: string }
  | { k: 'battle'; setup: BattleSetup; playerId: number }
  | { k: 'campaigns' }
  | { k: 'campaign'; faction: string }
  | { k: 'camp'; faction: string; battle?: string }
  | { k: 'campaignBattle'; faction: string; battle: string; units: string[] | null }
  | { k: 'rewards'; faction: string; outcome: Outcome };

/** A link like https://…/#join=ABCD drops a friend straight into the room after their name. */
export function inviteCode(): string {
  const m = /#join=([A-Za-z]{4})/.exec(location.hash);
  return m ? m[1]!.toUpperCase() : '';
}

export function App() {
  const [screen, setScreen] = useState<Screen>({ k: 'title' });
  // The menus have their own theme; rooms and battles choose their music themselves.
  useEffect(() => {
    if (screen.k !== 'battle' && screen.k !== 'room' && screen.k !== 'campaignBattle') music.play('title');
  }, [screen.k]);
  if (location.hash === '#art') return <ArtPreview />;
  switch (screen.k) {
    case 'title':
      return (
        <>
          <Title go={setScreen} />
          <VersionBadge />
        </>
      );
    case 'solo':
      return (
        <>
          <SoloSetup go={setScreen} />
          <VersionBadge />
        </>
      );
    case 'help':
      return (
        <>
          <Help back={() => setScreen({ k: 'title' })} />
          <VersionBadge />
        </>
      );
    case 'settings':
      return (
        <>
          <Settings back={() => setScreen({ k: 'title' })} />
          <VersionBadge />
        </>
      );
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
    case 'campaigns':
      return (
        <>
          <CampaignSelect go={setScreen} />
          <VersionBadge />
        </>
      );
    case 'campaign':
      return <CampaignMap key={screen.faction} faction={screen.faction} go={setScreen} />;
    case 'camp':
      return <Camp key={`${screen.faction}-${screen.battle ?? ''}`} faction={screen.faction} battle={screen.battle} go={setScreen} />;
    case 'campaignBattle':
      return <CampaignBattle faction={screen.faction} battle={screen.battle} units={screen.units} go={setScreen} />;
    case 'rewards':
      return <Rewards faction={screen.faction} outcome={screen.outcome} go={setScreen} />;
  }
}
