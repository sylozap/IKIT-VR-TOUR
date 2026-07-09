import type { Disposable } from '@/core/Disposable';
import { Viewer } from '@/viewer/Viewer';
import { UIManager } from '@/ui/UIManager';
import { PanoramaRepository } from '@/panorama/PanoramaRepository';
import { entryPanoramaId } from '@/config/panoramas';

/**
 * Application composition root.
 *
 * It builds the DOM scaffold, wires the {@link Viewer}, {@link UIManager} and
 * {@link PanoramaRepository} together (dependency injection happens here, in one
 * place), and owns navigation policy — the decision of *which* panorama to show.
 *
 * This is where future features attach: a `link:activated` handler already has
 * everything it needs to navigate the graph, and that is the single extension
 * point for the minimap, search, deep-linking and the rest.
 */
export class App implements Disposable {
  private readonly root: HTMLElement;
  private readonly viewer: Viewer;
  private readonly ui: UIManager;
  private readonly repository: PanoramaRepository;

  constructor(mount: HTMLElement) {
    this.repository = new PanoramaRepository();

    this.root = document.createElement('div');
    this.root.className = 'vt-root';

    const canvas = document.createElement('canvas');
    canvas.className = 'vt-canvas';
    this.root.append(canvas);
    mount.append(this.root);

    this.viewer = new Viewer({ canvas, container: this.root });
    this.ui = new UIManager(this.viewer, this.root);
    this.root.append(this.ui.element);

    // Navigation policy: a hotspot only *announces* intent; the app resolves it.
    this.viewer.events.on('link:activated', ({ targetId }) => {
      void this.navigateTo(targetId);
    });

    // Media policy: an info marker announces a video; the app plays it, and the
    // overlay's close button announces the intent to stop.
    this.viewer.events.on('infospot:activated', (activation) => {
      this.viewer.playVideo(activation);
    });
    this.viewer.events.on('video:close', () => {
      this.viewer.stopVideo();
    });
  }

  public async start(): Promise<void> {
    this.viewer.init();
    await this.navigateTo(entryPanoramaId);
  }

  public async navigateTo(id: string): Promise<void> {
    const node = this.repository.get(id);
    if (!node) {
      console.error(`Cannot navigate: unknown panorama "${id}"`);
      return;
    }
    await this.viewer.loadPanorama(node);
  }

  public dispose(): void {
    this.ui.dispose();
    this.viewer.dispose();
    this.root.remove();
  }
}
