import type { Disposable } from '@/core/Disposable';
import {
  isFullscreen,
  isFullscreenSupported,
  onFullscreenChange,
  toggleFullscreen,
} from '@/utils/fullscreen';

const ENTER_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`;
const EXIT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>`;

/** A single icon button that toggles fullscreen for a target element. */
export class FullscreenButton implements Disposable {
  public readonly element: HTMLButtonElement;
  private readonly target: HTMLElement;
  private readonly unsubscribe: () => void;

  constructor(target: HTMLElement) {
    this.target = target;
    this.element = document.createElement('button');
    this.element.className = 'vt-button';
    this.element.type = 'button';
    this.element.setAttribute('aria-label', 'Полноэкранный режим');
    this.element.addEventListener('click', this.onClick);

    // Hide the control entirely where the platform can't honour it (e.g. iPhone).
    this.element.hidden = !isFullscreenSupported();

    this.unsubscribe = onFullscreenChange(this.syncIcon);
    this.syncIcon();
  }

  public dispose(): void {
    this.element.removeEventListener('click', this.onClick);
    this.unsubscribe();
    this.element.remove();
  }

  private readonly onClick = (): void => {
    void toggleFullscreen(this.target);
  };

  private readonly syncIcon = (): void => {
    this.element.innerHTML = isFullscreen() ? EXIT_ICON : ENTER_ICON;
  };
}
