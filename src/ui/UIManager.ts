import type { Disposable } from '@/core/Disposable';
import type { Viewer } from '@/viewer/Viewer';
import { FullscreenButton } from './components/FullscreenButton';
import { LoadingOverlay } from './components/LoadingOverlay';
import { Minimap } from './components/Minimap';
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
  private readonly minimap: Minimap;
  private readonly videoOverlay: VideoOverlay;
  private readonly titleLabel: HTMLSpanElement;
  private readonly unsubscribers: Array<() => void> = [];

  constructor(viewer: Viewer, fullscreenTarget: HTMLElement) {
    this.viewer = viewer;

    this.element = document.createElement('div');
    this.element.className = 'vt-ui';

    const topBar = document.createElement('header');
    topBar.className = 'vt-topbar';

    this.titleLabel = document.createElement('span');
    this.titleLabel.className = 'vt-topbar__title';
    this.titleLabel.textContent = 'Виртуальная экскурсия';

    this.fullscreenButton = new FullscreenButton(fullscreenTarget);
    topBar.append(this.titleLabel, this.fullscreenButton.element);

    this.minimap = new Minimap(viewer);
    this.videoOverlay = new VideoOverlay(() => viewer.events.emit('video:close', undefined));
    this.loadingOverlay = new LoadingOverlay();
    this.element.append(
      topBar,
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
    this.minimap.dispose();
    this.videoOverlay.dispose();
    this.element.remove();
  }

  private bindViewerEvents(): void {
    const { events } = this.viewer;
    this.unsubscribers.push(
      events.on('panorama:loadstart', () => this.loadingOverlay.showLoading()),
      events.on('panorama:loaded', ({ node }) => {
        this.titleLabel.textContent = node.title;
        this.loadingOverlay.hide();
      }),
      events.on('panorama:error', () =>
        this.loadingOverlay.showError('Не удалось загрузить панораму'),
      ),
      events.on('context:lost', () =>
        this.loadingOverlay.showLoading('Восстановление графики…'),
      ),
      events.on('context:restored', () => this.loadingOverlay.hide()),
      events.on('video:started', ({ label }) => this.videoOverlay.show(label)),
      events.on('video:stopped', () => this.videoOverlay.hide()),
    );
  }
}
