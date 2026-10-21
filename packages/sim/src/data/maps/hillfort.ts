import { T } from '../../map/terrain';
import type { MapScript, Painter } from '../../map/mapgen';

// A hill fort on a rise in open country: a ring wall with three gates (north, west and
// east) and a war camp inside. Last Stand's defenders hold it while the enemy marches out
// of the woods on three sides.

const W = 400;
const H = 340;
const CX = 200;
const CY = 196;

function d2(x: number, y: number): number {
  return (x - CX) * (x - CX) + (y - CY) * (y - CY);
}

function build(p: Painter): void {
  p.fill(T.grass);
  p.roll(1.6, 90);
  p.hill(CX, CY, 115, 9);
  p.noiseFill(T.dry, 60, 0.6, 1);
  p.noiseFill(T.forest, 34, 0.64, 3, (_c, x, y) => d2(x, y) > 125 * 125);
  p.noiseFill(T.field, 40, 0.68, 2, (cur, x, y) => cur !== T.forest && d2(x, y) > 85 * 85 && y > CY + 40);
  p.noiseFill(T.rough, 20, 0.8, 4, (_c, x, y) => d2(x, y) < 105 * 105 && d2(x, y) > 55 * 55);
  // Trampled ground inside the walls.
  p.noiseFill(T.dirt, 14, 0.45, 5, (_c, x, y) => d2(x, y) < 44 * 44);
  // Roads out of the three gates.
  const on = [T.grass, T.dry, T.field, T.forest, T.rough];
  p.stroke([CX, CY - 46, CX + 8, CY - 110, CX - 6, 0], 4, T.road, 0, on);
  p.stroke([CX - 46, CY, CX - 120, CY - 8, 0, CY + 6], 4, T.road, 0, on);
  p.stroke([CX + 46, CY, CX + 120, CY + 8, W, CY - 2], 4, T.road, 0, on);
  // The ring wall, with gates where the roads come in.
  p.eachTile(CX - 60, CY - 60, CX + 60, CY + 60, (i, j, x, y) => {
    const dx = x - CX;
    const dy = y - CY;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 46 || d > 49.5) return;
    const gate = (Math.abs(dx) < 5 && dy < 0) || Math.abs(dy) < 5;
    p.set(i, j, gate ? T.road : T.wall);
  });
  p.lift(T.wall, 2.8);
  p.sea = -6;

  p.scatter('tree', 0.5, [T.forest]);
  p.scatter('bush', 0.012, [T.grass, T.dry]);
  p.scatter('rock', 0.16, [T.rough]);
  for (let k = 0; k < 8; k++) p.prop('tent', CX - 24 + (k % 4) * 16, CY + 14 + Math.floor(k / 4) * 14, 1);
  p.prop('banner', CX, CY - 4, 1.3);
  p.prop('column', CX - 46, CY - 12, 0.8);
  p.prop('column', CX + 46, CY - 12, 0.8);

  // Defenders inside the walls, facing the gates.
  p.zone('fort_n', CX - 30, CY - 42, CX + 30, CY - 16, 0, -1);
  p.zone('fort_w', CX - 42, CY - 22, CX - 16, CY + 24, -1, 0);
  p.zone('fort_e', CX + 16, CY - 22, CX + 42, CY + 24, 1, 0);
  p.zone('fort_c', CX - 14, CY - 10, CX + 14, CY + 12, 0, -1);
  // Where the enemy comes from.
  p.zone('north', 60, 6, W - 60, 44, 0, 1);
  p.zone('west', 6, 60, 44, H - 50, 1, 0);
  p.zone('east', W - 44, 60, W - 6, H - 50, -1, 0);
  // Objectives: the three gates.
  p.point('cp1', CX, CY - 48);
  p.point('cp2', CX - 48, CY);
  p.point('cp3', CX + 48, CY);
}

export const HILLFORT: MapScript = { id: 'hillfort', name: 'The Hill Fort', theme: 'meadow', w: W, h: H, build };
