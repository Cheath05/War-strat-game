// HD-2D post-processing: tilt-shift blur (the miniature diorama look), bloom on glints and
// sunlit highlights, a warm colour grade, tone mapping and a soft vignette.

import * as THREE from 'three';
import {
  BloomEffect,
  BrightnessContrastEffect,
  EffectComposer,
  EffectPass,
  HueSaturationEffect,
  KernelSize,
  RenderPass,
  TiltShiftEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from 'postprocessing';
import type { BlurLevel, Quality } from './quality';

export class PostFX {
  readonly composer: EffectComposer;
  private tilt: TiltShiftEffect | null = null;
  /** Focus band size before zoom adjustments: wider means less of the screen is blurred. */
  readonly baseArea: number;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, q: Quality, blur: BlurLevel) {
    this.baseArea = blur === 'strong' ? 0.45 : 0.68;
    this.composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
    this.composer.addPass(new RenderPass(scene, camera));
    const effects = [];
    if (q.bloom) effects.push(new BloomEffect({ luminanceThreshold: 0.82, luminanceSmoothing: 0.25, intensity: 0.9, mipmapBlur: true, radius: 0.7 }));
    if (q.tiltShift && blur !== 'off') {
      this.tilt = new TiltShiftEffect({
        offset: 0.05,
        focusArea: this.baseArea,
        feather: blur === 'strong' ? 0.32 : 0.42,
        kernelSize: blur === 'strong' ? KernelSize.MEDIUM : KernelSize.VERY_SMALL,
        resolutionScale: 0.5,
      });
      effects.push(this.tilt);
    }
    effects.push(new HueSaturationEffect({ saturation: 0.12, hue: 0 }));
    effects.push(new BrightnessContrastEffect({ brightness: 0.0, contrast: 0.08 }));
    effects.push(new ToneMappingEffect({ mode: ToneMappingMode.AGX }));
    if (q.vignette) effects.push(new VignetteEffect({ darkness: 0.42, offset: 0.32 }));
    this.composer.addPass(new EffectPass(camera, ...effects));
  }

  /** Focus band: centre (0 = middle of the screen, + up) and size. */
  focus(offset: number, area: number): void {
    if (!this.tilt) return;
    this.tilt.offset += (offset - this.tilt.offset) * 0.1;
    this.tilt.focusArea += (area - this.tilt.focusArea) * 0.1;
  }

  setSize(w: number, h: number): void {
    this.composer.setSize(w, h, false);
  }

  render(dt: number): void {
    this.composer.render(dt);
  }

  dispose(): void {
    this.composer.dispose();
  }
}
