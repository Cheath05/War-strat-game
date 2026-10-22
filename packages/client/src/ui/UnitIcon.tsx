import { memo, useEffect, useRef } from 'react';
import { unitType } from '@pl/sim';
import { frameKey, spriteKey } from '../game/art/atlas';
import { colorOf } from '../game/art/palette';
import { sharedArt } from '../game/render/BattleRenderer';

/** A unit's portrait: its front idle frame in the army's colours, drawn from the atlas into a square. */
export const UnitIcon = memo(function UnitIcon({ type, pal }: { type: string; pal: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const { atlas, palette } = sharedArt();
    const px = atlas.cells.get(frameKey(spriteKey(unitType(type)), 0, 'idle0'));
    if (!px) return;
    const side = Math.max(px.w, px.h);
    c.width = side;
    c.height = side;
    const g = c.getContext('2d')!;
    const img = g.createImageData(side, side);
    // Centred across, standing on the bottom edge.
    const ox = (side - px.w) >> 1;
    const oy = side - px.h;
    for (let i = 0; i < px.data.length; i++) {
      const idx = px.data[i]!;
      if (!idx) continue;
      const [r, gg, b, a] = colorOf(palette, pal, idx);
      const k = ((oy + Math.floor(i / px.w)) * side + ox + (i % px.w)) * 4;
      img.data[k] = r;
      img.data[k + 1] = gg;
      img.data[k + 2] = b;
      img.data[k + 3] = a;
    }
    g.putImageData(img, 0, 0);
  }, [type, pal]);
  return <canvas ref={ref} />;
});
