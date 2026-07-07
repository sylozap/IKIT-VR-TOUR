import {
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import type { Disposable } from '@/core/Disposable';
import type { Size } from '@/core/types';
import { viewerConfig } from '@/config/viewer';

export interface ContextHandlers {
  onLost: () => void;
  onRestored: () => void;
}

/**
 * Owns the single {@link WebGLRenderer} and the WebGL context lifecycle.
 *
 * Two production concerns live here and nowhere else:
 *  - **devicePixelRatio clamping** on every resize, so the drawing buffer never
 *    grows beyond {@link viewerConfig.maxPixelRatio};
 *  - **context loss/restore** handling. A lost context (GPU reset, tab in
 *    background on mobile, driver hiccup) otherwise freezes or crashes the page;
 *    we swallow the default behaviour and let the owner re-drive the loop.
 */
export class Renderer implements Disposable {
  public readonly instance: WebGLRenderer;
  private readonly canvas: HTMLCanvasElement;
  private contextHandlers: ContextHandlers | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.instance = new WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.instance.outputColorSpace = SRGBColorSpace;

    this.canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);
  }

  public setContextHandlers(handlers: ContextHandlers): void {
    this.contextHandlers = handlers;
  }

  /** Largest anisotropy the GPU supports — used to keep grazing-angle texels
   * sharp on the panorama sphere. */
  public get maxAnisotropy(): number {
    return this.instance.capabilities.getMaxAnisotropy();
  }

  public setSize({ width, height }: Size): void {
    this.instance.setPixelRatio(Math.min(window.devicePixelRatio, viewerConfig.maxPixelRatio));
    // `false`: never let three rewrite the canvas CSS size — layout is owned by CSS.
    this.instance.setSize(width, height, false);
  }

  public render(scene: Scene, camera: PerspectiveCamera): void {
    this.instance.render(scene, camera);
  }

  public dispose(): void {
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost, false);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored, false);
    this.instance.dispose();
    this.instance.forceContextLoss();
  }

  private readonly handleContextLost = (event: Event): void => {
    // Prevent the browser's default "context is gone forever" behaviour so it
    // can be restored.
    event.preventDefault();
    this.contextHandlers?.onLost();
  };

  private readonly handleContextRestored = (): void => {
    this.contextHandlers?.onRestored();
  };
}
