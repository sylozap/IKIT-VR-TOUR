import { SRGBColorSpace, VideoTexture } from 'three';
import type { Disposable } from '@/core/Disposable';
import type { PanoramaNode, Size } from '@/core/types';
import type { ViewerEvents } from '@/core/events';
import type { InfoActivation } from '@/hotspots/HotspotLayer';
import { degToRad } from '@/utils/math';
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
  /** The 360° video sphere shown over the scene while a clip plays. */
  private videoPanorama: Panorama | null = null;
  private videoElement: HTMLVideoElement | null = null;
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
      {
        onNavigate: (targetId) => this.events.emit('link:activated', { targetId }),
        onInfo: (activation) => this.events.emit('infospot:activated', activation),
      },
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
    // Leaving a scene always ends any 360° video playing over it.
    this.stopVideo();
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
      this.hotspots.setContent(node.links, node.infoSpots ?? []);

      this.events.emit('panorama:loaded', { node });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.events.emit('panorama:error', { id: node.id, error });
      throw error;
    }
  }

  /**
   * Play an equirectangular 360° video on the sphere in place of the current
   * panorama. The panorama sphere and its markers are hidden (not disposed) and
   * restored by {@link stopVideo}, which also fires when the clip ends. The
   * camera keeps its orientation, so the user simply looks around the video.
   */
  public playVideo(activation: InfoActivation): void {
    this.stopVideo();
    if (this.disposed || !this.currentPanorama) return;

    const video = document.createElement('video');
    video.src = activation.video;
    video.crossOrigin = 'anonymous';
    video.loop = false;
    video.playsInline = true;
    video.preload = 'auto';
    video.addEventListener('ended', this.onVideoEnded);
    video.addEventListener('error', this.onVideoError);
    this.videoElement = video;

    const texture = new VideoTexture(video);
    texture.colorSpace = SRGBColorSpace;
    const sphere = new Panorama(texture);
    this.videoPanorama = sphere;

    this.sceneManager.remove(this.currentPanorama.mesh);
    this.sceneManager.add(sphere.mesh);
    this.hotspots.setActive(false);

    void video.play().catch(() => {
      // Autoplay was refused or the source is missing — bail out cleanly.
      this.stopVideo();
    });

    this.events.emit('video:started', activation.label ? { label: activation.label } : {});
  }

  /** Tear down the 360° video (if any) and restore the panorama scene. */
  public stopVideo(): void {
    if (!this.videoPanorama && !this.videoElement) return;

    if (this.videoElement) {
      this.videoElement.removeEventListener('ended', this.onVideoEnded);
      this.videoElement.removeEventListener('error', this.onVideoError);
      this.videoElement.pause();
      this.videoElement.removeAttribute('src');
      this.videoElement.load();
      this.videoElement = null;
    }
    if (this.videoPanorama) {
      this.sceneManager.remove(this.videoPanorama.mesh);
      this.videoPanorama.dispose();
      this.videoPanorama = null;
    }
    if (this.currentPanorama && !this.disposed) {
      this.sceneManager.add(this.currentPanorama.mesh);
      this.hotspots.setActive(true);
    }
    if (!this.disposed) this.events.emit('video:stopped', undefined);
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
    this.stopVideo();
    this.renderLoop.stop();
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.hotspots.dispose();
    this.currentPanorama?.dispose();
    this.sceneManager.dispose();
    this.renderer.dispose();
    this.events.clear();
  }

  /** Live camera yaw in degrees, for UI that visualises the look direction. */
  public get cameraYaw(): number {
    return this.cameraController.yawDegrees;
  }

  /** Change the field of view by `deltaFov` degrees (negative zooms in). Used by
   * the on-screen zoom buttons; damping makes each press glide. */
  public zoomBy(deltaFov: number): void {
    this.cameraController.zoom(deltaFov);
  }

  /** Nudge the view by a fixed yaw/pitch step in degrees. Used by the on-screen
   * arrow buttons for precise, small movements. */
  public nudge(deltaYawDeg: number, deltaPitchDeg: number): void {
    this.cameraController.rotate(degToRad(deltaYawDeg), degToRad(deltaPitchDeg));
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
    this.controls.update(deltaSeconds);
    this.cameraController.update(deltaSeconds);
    this.hotspots.update(deltaSeconds);
    // Push the newest decoded video frame to the GPU while a clip plays.
    if (this.videoPanorama) this.videoPanorama.refresh();
    this.renderer.render(this.sceneManager.scene, this.cameraController.camera);
  };

  private readonly onVideoEnded = (): void => {
    this.stopVideo();
  };

  private readonly onVideoError = (): void => {
    // The scene is still mounted behind the video, so fail quietly back to it;
    // `stopVideo` emits `video:stopped` and the UI dismisses the overlay.
    console.error(`360° video failed to load: "${this.videoElement?.src ?? ''}"`);
    this.stopVideo();
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
