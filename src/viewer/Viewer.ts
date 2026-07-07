import type { Disposable } from '@/core/Disposable';
import type { PanoramaNode, Size } from '@/core/types';
import type { ViewerEvents } from '@/core/events';
import { EventBus } from '@/core/EventBus';
import { Renderer } from '@/engine/Renderer';
import { RenderLoop } from '@/engine/RenderLoop';
import { SceneManager } from '@/scene/SceneManager';
import { CameraController } from '@/camera/CameraController';
import { ControlsManager } from '@/controls/ControlsManager';
import { Panorama } from '@/panorama/Panorama';
import { PanoramaLoader } from '@/panorama/PanoramaLoader';
import { HotspotLayer } from '@/hotspots/HotspotLayer';

export interface ViewerOptions {
  /** Canvas the WebGL context is bound to. */
  canvas: HTMLCanvasElement;
  /** Element whose size defines the viewport; observed for responsive resizes. */
  container: HTMLElement;
}

/**
 * The rendering facade. It composes the engine, scene, camera, controls and the
 * current panorama, and exposes the lifecycle the application drives:
 * `init → loadPanorama* → dispose`, plus `resize`.
 *
 * It deliberately holds **no application logic**: it does not decide *which*
 * panorama to show or what a hotspot does — it only renders what it is told and
 * announces what happened via {@link events}. Navigation policy lives in the
 * app layer.
 */
export class Viewer implements Disposable {
  public readonly events = new EventBus<ViewerEvents>();

  private readonly container: HTMLElement;
  private readonly renderer: Renderer;
  private readonly sceneManager: SceneManager;
  private readonly cameraController: CameraController;
  private readonly controls: ControlsManager;
  private readonly hotspots: HotspotLayer;
  private readonly loader: PanoramaLoader;
  private readonly renderLoop: RenderLoop;
  private readonly resizeObserver: ResizeObserver;

  private currentPanorama: Panorama | null = null;
  /** Aborts the in-flight load when a newer one starts or on dispose. */
  private loadAbort: AbortController | null = null;
  private disposed = false;

  constructor(options: ViewerOptions) {
    this.container = options.container;
    this.renderer = new Renderer(options.canvas);
    this.sceneManager = new SceneManager();
    this.cameraController = new CameraController(this.aspect);
    this.controls = new ControlsManager(options.container, this.cameraController);
    this.hotspots = new HotspotLayer(
      this.sceneManager,
      this.cameraController.camera,
      options.container,
      (targetId) => this.events.emit('link:activated', { targetId }),
    );
    this.loader = new PanoramaLoader(this.renderer.maxAnisotropy);
    this.renderLoop = new RenderLoop(this.tick);

    this.renderer.setContextHandlers({
      onLost: this.handleContextLost,
      onRestored: this.handleContextRestored,
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
  }

  public init(): void {
    this.resize();
    this.resizeObserver.observe(this.container);
    this.renderLoop.start();
  }

  /**
   * Load and present a panorama. A new call cancels any load still in flight,
   * then swaps the sphere atomically — the previous one is disposed only after
   * the new texture is ready, so the screen never flashes empty.
   */
  public async loadPanorama(node: PanoramaNode): Promise<void> {
    this.loadAbort?.abort();
    const abort = new AbortController();
    this.loadAbort = abort;

    this.events.emit('panorama:loadstart', { id: node.id });
    try {
      const texture = await this.loader.load(node.image, abort.signal);
      if (this.disposed || abort.signal.aborted) {
        texture.dispose();
        return;
      }

      const next = new Panorama(texture);
      this.sceneManager.add(next.mesh);
      if (this.currentPanorama) {
        this.sceneManager.remove(this.currentPanorama.mesh);
        this.currentPanorama.dispose();
      }
      this.currentPanorama = next;
      this.cameraController.setOrientation(node.initialYaw, node.initialPitch, true);
      this.hotspots.setLinks(node.links);

      this.events.emit('panorama:loaded', { node });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.events.emit('panorama:error', { id: node.id, error });
      throw error;
    }
  }

  public resize(): void {
    const size = this.size;
    this.renderer.setSize(size);
    this.cameraController.setAspect(size.width / size.height);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.loadAbort?.abort();
    this.renderLoop.stop();
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.hotspots.dispose();
    this.currentPanorama?.dispose();
    this.sceneManager.dispose();
    this.renderer.dispose();
    this.events.clear();
  }

  private get size(): Size {
    // Guard against a zero-height container during early layout.
    return {
      width: this.container.clientWidth || 1,
      height: this.container.clientHeight || 1,
    };
  }

  private get aspect(): number {
    const { width, height } = this.size;
    return width / height;
  }

  private readonly tick = (deltaSeconds: number): void => {
    this.cameraController.update(deltaSeconds);
    this.hotspots.update(deltaSeconds);
    this.renderer.render(this.sceneManager.scene, this.cameraController.camera);
  };

  private readonly handleContextLost = (): void => {
    this.renderLoop.stop();
    this.events.emit('context:lost', undefined);
  };

  private readonly handleContextRestored = (): void => {
    this.currentPanorama?.refresh();
    this.resize();
    if (!this.disposed) this.renderLoop.start();
    this.events.emit('context:restored', undefined);
  };
}
