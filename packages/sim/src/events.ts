// Things that happened during a tick, for the renderer, sound and HUD. Events are never
// part of the world state and never feed back into the simulation.

export type Tone = 'info' | 'good' | 'bad' | 'epic';

export type SimEvent =
  | { k: 'swing'; s: number }
  | { k: 'hit'; s: number; by: number; x: number; y: number; big: boolean }
  | { k: 'block'; s: number; x: number; y: number }
  | { k: 'death'; s: number; u: number; army: number; type: string; x: number; y: number; fx: number; fy: number; rank: number }
  | { k: 'fire'; u: number; kind: number; n: number; x: number; y: number }
  | { k: 'land'; kind: number; x: number; y: number; hit: boolean }
  | { k: 'charge'; u: number; x: number; y: number }
  | { k: 'impact'; u: number; x: number; y: number; braced: boolean }
  | { k: 'rout'; u: number }
  | { k: 'rally'; u: number }
  | { k: 'shatter'; u: number }
  | { k: 'genDead'; army: number; x: number; y: number }
  | { k: 'officerDead'; u: number; rank: number }
  | { k: 'ability'; a: string; army: number; u: number; x: number; y: number }
  | { k: 'possess'; p: number; s: number }
  | { k: 'possLost'; p: number; s: number }
  | { k: 'msg'; text: string; tone: Tone; side: number; to: number }
  | { k: 'phase'; phase: string }
  | { k: 'objective'; id: number; owner: number }
  | { k: 'wave'; n: number }
  | { k: 'arrive'; u: number }
  | { k: 'end'; winner: number; reason: string };
