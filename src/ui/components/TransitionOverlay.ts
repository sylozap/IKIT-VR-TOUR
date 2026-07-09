import type { Disposable } from '@/core/Disposable';

/**
 * A full-bleed blur that softens the panorama while the next scene loads.
 *
 * It sits just above the canvas but below the interactive chrome, so only the
 * 360° view blurs — the top bar, minimap and buttons stay crisp. The blur is a
 * `backdrop-filter` on the live canvas (no snapshot needed); toggling one class
 * fades it in on load-start and out on load, which reads as the old scene
 * dissolving into the new one instead of a spinner interrupting the flow.
 */
export class TransitionOverlay implements Disposable {
  public readonly element: HTMLDivElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'vt-transition';
  }

  public show(): void {
    this.element.classList.add('is-active');
  }

  public hide(): void {
    this.element.classList.remove('is-active');
  }

  public dispose(): void {
    this.element.remove();
  }
}
