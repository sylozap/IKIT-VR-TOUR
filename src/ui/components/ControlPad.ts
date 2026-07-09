import type { Disposable } from '@/core/Disposable';
import { viewerConfig } from '@/config/viewer';

export interface ControlPadHandlers {
  /** Change the field of view by `deltaFov` degrees (negative zooms in). */
  zoom: (deltaFov: number) => void;
  /** Nudge the view by a yaw/pitch step, in degrees. */
  pan: (deltaYawDeg: number, deltaPitchDeg: number) => void;
}

const ICONS = {
  zoomIn: `<path d="M12 5v14M5 12h14"/>`,
  zoomOut: `<path d="M5 12h14"/>`,
  up: `<path d="M12 8l6 9H6z"/>`,
  down: `<path d="M12 16l-6-9h12z"/>`,
  left: `<path d="M8 12l9-6v12z"/>`,
  right: `<path d="M16 12l-9 6V6z"/>`,
} as const;

/**
 * An on-screen pad of glassy buttons: zoom in / out and four arrows that nudge
 * the view in small steps. Each button repeats while held. It owns no camera
 * state — it only calls the injected {@link ControlPadHandlers}, keeping the UI
 * decoupled from the viewer, exactly like the other overlay controls.
 */
export class ControlPad implements Disposable {
  public readonly element: HTMLDivElement;
  private readonly handlers: ControlPadHandlers;
  private readonly buttonDisposers: Array<() => void> = [];
  private repeatTimer = 0;

  constructor(handlers: ControlPadHandlers) {
    this.handlers = handlers;

    this.element = document.createElement('div');
    this.element.className = 'vt-controlpad';

    const { zoomStep, panStep } = viewerConfig.buttons;
    const zoomGroup = this.makeGroup([
      this.makeButton('Приблизить', ICONS.zoomIn, () => this.handlers.zoom(-zoomStep)),
      this.makeButton('Отдалить', ICONS.zoomOut, () => this.handlers.zoom(zoomStep), 'is-minus'),
    ]);
    const panGroup = this.makeGroup([
      this.makeButton('Вверх', ICONS.up, () => this.handlers.pan(0, panStep)),
      this.makeButton('Вниз', ICONS.down, () => this.handlers.pan(0, -panStep)),
      this.makeButton('Влево', ICONS.left, () => this.handlers.pan(panStep, 0)),
      this.makeButton('Вправо', ICONS.right, () => this.handlers.pan(-panStep, 0)),
    ]);

    this.element.append(zoomGroup, panGroup);
  }

  public show(): void {
    this.element.hidden = false;
  }

  public hide(): void {
    this.element.hidden = true;
  }

  public dispose(): void {
    this.stopRepeat();
    for (const off of this.buttonDisposers) off();
    this.element.remove();
  }

  private makeGroup(children: HTMLButtonElement[]): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'vt-controlpad__group';
    group.append(...children);
    return group;
  }

  private makeButton(
    label: string,
    icon: string,
    action: () => void,
    modifier?: string,
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `vt-button vt-controlpad__btn${modifier ? ` ${modifier}` : ''}`;
    button.setAttribute('aria-label', label);
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg>`;

    const onDown = (event: PointerEvent): void => {
      event.preventDefault();
      // Capture so the matching pointerup lands on the button even if the finger
      // slides off it — and so it isn't swallowed by the UI's event isolation.
      button.setPointerCapture(event.pointerId);
      action();
      this.stopRepeat();
      this.repeatTimer = window.setInterval(action, viewerConfig.buttons.repeatInterval);
    };
    button.addEventListener('pointerdown', onDown);
    button.addEventListener('pointerup', this.stopRepeat);
    button.addEventListener('pointercancel', this.stopRepeat);
    this.buttonDisposers.push(() => {
      button.removeEventListener('pointerdown', onDown);
      button.removeEventListener('pointerup', this.stopRepeat);
      button.removeEventListener('pointercancel', this.stopRepeat);
    });
    return button;
  }

  private readonly stopRepeat = (): void => {
    if (this.repeatTimer) {
      clearInterval(this.repeatTimer);
      this.repeatTimer = 0;
    }
  };
}
