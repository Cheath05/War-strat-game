// Lookups for campaign content: battles and each country's campaign register here once.

import type { BattleDef, CampaignDef } from './types';

const BATTLES = new Map<string, BattleDef>();
const CAMPAIGNS = new Map<string, CampaignDef>();

export function registerBattles(list: BattleDef[]): void {
  for (const b of list) BATTLES.set(b.id, b);
}

export function battleDef(id: string): BattleDef {
  const b = BATTLES.get(id);
  if (!b) throw new Error(`Unknown battle: ${id}`);
  return b;
}

export function hasBattle(id: string): boolean {
  return BATTLES.has(id);
}

export function listBattles(): BattleDef[] {
  return [...BATTLES.values()];
}

export function registerCampaign(c: CampaignDef): void {
  CAMPAIGNS.set(c.faction, c);
}

export function campaignDef(faction: string): CampaignDef {
  const c = CAMPAIGNS.get(faction);
  if (!c) throw new Error(`No campaign for ${faction}`);
  return c;
}

export function listCampaigns(): CampaignDef[] {
  return [...CAMPAIGNS.values()];
}
