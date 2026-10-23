import { useState } from 'react';
import { campaignDef } from '@pl/sim';
import type { Screen } from '../../app/App';
import { applyOutcome, battleSetup, loadCampaign, saveCampaign } from '../../app/campaign';
import { loadProfile } from '../../app/profile';
import { BattleScreen } from '../BattleScreen';
import { briefingFor } from './text';

/** A campaign battle: fought as a solo battle, then its outcome is applied to the campaign. */
export function CampaignBattle({ faction, battle, units, go }: { faction: string; battle: string; units: string[] | null; go: (s: Screen) => void }) {
  const [run] = useState(() => {
    const save = loadCampaign(faction)!;
    const node = campaignDef(faction).nodes.find((n) => n.battle === battle)!;
    const { setup, slot } = battleSetup(save, node, units, loadProfile().name || 'Commander');
    return { save, node, setup, slot, briefing: briefingFor(save, node) };
  });
  return (
    <BattleScreen
      setup={run.setup}
      playerId={1}
      briefing={run.briefing}
      exit={(b) => {
        // Left before the end: nothing changes, and the battle can be fought again.
        if (!b?.world.result) {
          go({ k: 'campaign', faction });
          return;
        }
        const { save, outcome } = applyOutcome(run.save, run.node, b, run.slot);
        saveCampaign(save);
        go({ k: 'rewards', faction, outcome });
      }}
    />
  );
}
