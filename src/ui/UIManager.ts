import type { Disposable } from '@/core/Disposable';
import type { Viewer } from '@/viewer/Viewer';
import { ControlPad } from './components/ControlPad';
import { FullscreenButton } from './components/FullscreenButton';
import { LoadingOverlay } from './components/LoadingOverlay';
import { Minimap } from './components/Minimap';
import { TransitionOverlay } from './components/TransitionOverlay';
import { VideoOverlay } from './components/VideoOverlay';

/**
 * Owns the DOM chrome layered above the canvas (title bar, fullscreen control,
 * loading overlay) and binds it to the {@link Viewer} purely through events.
 *
 * The UI never imports engine internals and the Viewer never imports the UI —
 * they meet only at the typed event bus, which keeps the layers independently
 * replaceable (this is where a future minimap, search box or locale switcher
 * would mount).
 */
export class UIManager implements Disposable {
  public readonly element: HTMLDivElement;
  private readonly viewer: Viewer;
  private readonly fullscreenButton: FullscreenButton;
  private readonly loadingOverlay: LoadingOverlay;
  private readonly transitionOverlay: TransitionOverlay;
  private readonly minimap: Minimap;
  private readonly videoOverlay: VideoOverlay;
  private readonly controlPad: ControlPad;
  private readonly titleLabel: HTMLSpanElement;
  private readonly unsubscribers: Array<() => void> = [];
  /** The first load has nothing to blur; it gets the spinner, the rest blur. */
  private hasRenderedScene = false;

  constructor(viewer: Viewer, fullscreenTarget: HTMLElement) {
    this.viewer = viewer;

    this.element = document.createElement('div');
    this.element.className = 'vt-ui';
    // Interactive overlay controls bubble their pointer/wheel events up to here;
    // stop them so the canvas-control layer underneath never captures the pointer
    // (which would otherwise swallow button clicks) or rotates behind the UI.
    this.element.addEventListener('pointerdown', stopEvent);
    this.element.addEventListener('pointerup', stopEvent);
    this.element.addEventListener('wheel', stopEvent, { passive: false });

    const topBar = document.createElement('header');
    topBar.className = 'vt-topbar';

    this.titleLabel = document.createElement('span');
    this.titleLabel.className = 'vt-topbar__title';
    this.titleLabel.textContent = 'Виртуальная экскурсия';

    this.fullscreenButton = new FullscreenButton(fullscreenTarget);
    topBar.append(this.titleLabel, this.fullscreenButton.element);

    this.minimap = new Minimap(viewer);
    this.videoOverlay = new VideoOverlay(() => viewer.events.emit('video:close', undefined));
    this.controlPad = new ControlPad({
      zoom: (deltaFov) => viewer.zoomBy(deltaFov),
      pan: (deltaYaw, deltaPitch) => viewer.nudge(deltaYaw, deltaPitch),
    });
    this.transitionOverlay = new TransitionOverlay();
    this.loadingOverlay = new LoadingOverlay();
    // The transition blur goes first so it sits under the crisp chrome; the
    // loading/error overlay goes last so it can cover everything.
    this.element.append(
      this.transitionOverlay.element,
      topBar,
      this.controlPad.element,
      this.minimap.element,
      this.videoOverlay.element,
      this.loadingOverlay.element,
    );

    this.bindViewerEvents();
  }

  public dispose(): void {
    for (const off of this.unsubscribers) off();
    this.fullscreenButton.dispose();
    this.loadingOverlay.dispose();
    this.transitionOverlay.dispose();
    this.minimap.dispose();
    this.videoOverlay.dispose();
    this.controlPad.dispose();
    this.element.remove();
  }

  private bindViewerEvents(): void {
    const { events } = this.viewer;
    this.unsubscribers.push(
      // First scene: spinner (black screen, nothing to blur). Every scene after:
      // blur the current view while the next one loads.
      events.on('panorama:loadstart', () => {
        if (this.hasRenderedScene) this.transitionOverlay.show();
        else this.loadingOverlay.showLoading();
      }),
      events.on('panorama:loaded', ({ node }) => {
        this.titleLabel.textContent = node.title;
        this.hasRenderedScene = true;
        this.loadingOverlay.hide();
        this.transitionOverlay.hide();
      }),
      events.on('panorama:error', () => {
        this.loadingOverlay.showError('Не удалось загрузить панораму');
        this.transitionOverlay.hide();
      }),
      events.on('context:lost', () =>
        this.loadingOverlay.showLoading('Восстановление графики…'),
      ),
      events.on('context:restored', () => this.loadingOverlay.hide()),
      events.on('video:started', ({ label }) => {
        this.videoOverlay.show(label);
        this.controlPad.hide();
      }),
      events.on('video:stopped', () => {
        this.videoOverlay.hide();
        this.controlPad.show();
      }),
    );
  }
}

/** Keep an overlay interaction from reaching the canvas controls beneath it. */
function stopEvent(event: Event): void {
  event.stopPropagation();
}
