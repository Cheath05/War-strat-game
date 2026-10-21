// Graphics presets. The battle is identical at every setting; only the look and the cost
// change. "Pixel size" renders at a lower resolution and scales up with crisp pixels.

export type QualityName = 'low' | 'medium' | 'high' | 'ultra';

export interface Quality {
  name: QualityName;
  shadows: boolean;
  shadowMap: number;
  /** Soldiers cast real shadows (otherwise soft blobs under their feet). */
  spriteShadows: boolean;
  bloom: boolean;
  tiltShift: boolean;
  vignette: boolean;
  particles: number;
  ambientMotes: boolean;
}

export const QUALITY: Record<QualityName, Quality> = {
  low: { name: 'low', shadows: false, shadowMap: 512, spriteShadows: false, bloom: false, tiltShift: false, vignette: false, particles: 400, ambientMotes: false },
  medium: { name: 'medium', shadows: true, shadowMap: 1024, spriteShadows: false, bloom: true, tiltShift: true, vignette: true, particles: 1200, ambientMotes: true },
  high: { name: 'high', shadows: true, shadowMap: 2048, spriteShadows: true, bloom: true, tiltShift: true, vignette: true, particles: 2500, ambientMotes: true },
  ultra: { name: 'ultra', shadows: true, shadowMap: 4096, spriteShadows: true, bloom: true, tiltShift: true, vignette: true, particles: 4000, ambientMotes: true },
};

export type BlurLevel = 'off' | 'light' | 'strong';

export interface GraphicsSettings {
  quality: QualityName;
  /** Tilt-shift (miniature) blur at the top and bottom of the screen. */
  blur: BlurLevel;
  /** 1 = native, 2 = chunky pixels (half resolution), 3 = very chunky. */
  pixelSize: number;
  showFps: boolean;
}

const KEY = 'pl.graphics';

let cached: GraphicsSettings | null = null;

/** The player's graphics settings (read once, then kept; the first guess is saved). */
export function loadGraphics(): GraphicsSettings {
  if (cached) return { ...cached };
  let g: GraphicsSettings | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) g = { ...defaultGraphics(), ...JSON.parse(raw) };
  } catch {
    // storage unavailable: defaults
  }
  if (!g) {
    g = defaultGraphics();
    saveGraphics(g);
  }
  cached = g;
  return { ...g };
}

export function saveGraphics(g: GraphicsSettings): void {
  cached = { ...g };
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch {
    // ignore
  }
}

let detected: QualityName | null = null;

/**
 * A first guess at the quality from the GPU's name: probed once per page, and the probe's
 * WebGL context is released at once. (Browsers keep only about 16 contexts and drop the
 * oldest, which would be the game's own canvas: the screen would flash blank.)
 */
function detectQuality(): QualityName {
  if (detected) return detected;
  let quality: QualityName = 'medium';
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
    const name = dbg && gl ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    if (/RTX|Radeon RX|Apple M[2-9] (Pro|Max|Ultra)|M[3-9]/i.test(name)) quality = 'high';
    if (/Intel.*(HD|UHD) Graphics [1-6]|Mali|Adreno|PowerVR/i.test(name)) quality = 'low';
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    // keep medium
  }
  detected = quality;
  return quality;
}

/** A first guess from the GPU and screen; the player can change it in Settings. */
export function defaultGraphics(): GraphicsSettings {
  return { quality: detectQuality(), blur: 'light', pixelSize: 1, showFps: false };
}
