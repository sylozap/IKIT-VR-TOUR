import type { Disposable } from '@/core/Disposable';

export type VideoOverlayCloseHandler = () => void;

const CLOSE_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

/**
 * The chrome shown while a 360° video plays: a title chip and a close button.
 * It owns no playback — it only surfaces a caption and reports the intent to
 * close via {@link onClose}, keeping the UI decoupled from the viewer.
 */
export class VideoOverlay implements Disposable {
  public readonly element: HTMLDivElement;
  private readonly label: HTMLSpanElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly onClose: VideoOverlayCloseHandler;

  constructor(onClose: VideoOverlayCloseHandler) {
    this.onClose = onClose;

    this.element = document.createElement('div');
    this.element.className = 'vt-video';
    this.element.hidden = true;

    this.label = document.createElement('span');
    this.label.className = 'vt-video__label';

    this.closeButton = document.createElement('button');
    this.closeButton.type = 'button';
    this.closeButton.className = 'vt-button vt-video__close';
    this.closeButton.setAttribute('aria-label', 'Закрыть видео');
    this.closeButton.innerHTML = CLOSE_ICON;
    this.closeButton.addEventListener('click', this.handleClose);

    this.element.append(this.label, this.closeButton);
  }

  public show(label?: string): void {
    this.label.textContent = label ?? '';
    this.label.hidden = !label;
    this.element.hidden = false;
  }

  public hide(): void {
    this.element.hidden = true;
  }

  public dispose(): void {
    this.closeButton.removeEventListener('click', this.handleClose);
    this.element.remove();
  }

  private readonly handleClose = (): void => {
    this.onClose();
  };
}
