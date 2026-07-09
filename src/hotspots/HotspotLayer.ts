import {
  type PerspectiveCamera,
  Group,
  Raycaster,
  SpriteMaterial,
  type Texture,
  Vector2,
} from 'three';
import type { Disposable } from '@/core/Disposable';
import type { InfoSpot, PanoramaLink } from '@/core/types';
import type { SceneManager } from '@/scene/SceneManager';
import { viewerConfig } from '@/config/viewer';
import { createHotspotTexture } from './hotspotTexture';
import { createInfoTexture } from './infoTexture';
import { Hotspot } from './Hotspot';

/** What the app is told when an info marker is tapped. */
export interface InfoActivation {
  video: string;
  label?: string;
}

export interface HotspotHandlers {
  /** A navigation arrow was tapped; navigate to this panorama id. */
  onNavigate: (targetId: string) => void;
  /** An info marker was tapped; play this 360° video. */
  onInfo: (activation: InfoActivation) => void;
}

/**
 * Renders the current panorama's navigation links **and** its 360°-video info
 * markers as clickable 3D billboards, and turns a tap/click on one into the
 * matching callback.
 *
 * Responsibilities kept here (and nowhere else):
 *  - a single {@link Group} added to the scene once and rebuilt per panorama;
 *  - two shared marker {@link Texture}/{@link SpriteMaterial} pairs (nav + info),
 *    disposed on teardown;
 *  - pointer hit-testing via {@link Raycaster}, with **tap-vs-drag**
 *    discrimination so a marker never fires at the end of a look-around drag.
 *
 * It never decides what a marker *does* — it reads the sprite's payload and
 * reports it upward; the app resolves navigation, and the viewer plays video.
 */
export class HotspotLayer implements Disposable {
  private readonly group = new Group();
  private readonly camera: PerspectiveCamera;
  private readonly element: HTMLElement;
  private readonly sceneManager: SceneManager;
  private readonly handlers: HotspotHandlers;

  private readonly navTexture: Texture;
  private readonly navMaterial: SpriteMaterial;
  private readonly infoTexture: Texture;
  private readonly infoMaterial: SpriteMaterial;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();

  private navHotspots: Hotspot[] = [];
  private infoHotspots: Hotspot[] = [];
  private elapsed = 0;
  /** Nav-marker image aspect (width/height); 1 until the texture image loads. */
  private iconAspect = 1;
  /** While false, taps are ignored (e.g. a 360° video is playing). */
  private enabled = true;

  /** The candidate press being tracked for tap detection. */
  private press: { id: number; x: number; y: number; time: number } | null = null;
  /** A second simultaneous pointer cancels the candidate (pinch, not tap). */
  private multiTouch = false;

  constructor(
    sceneManager: SceneManager,
    camera: PerspectiveCamera,
    element: HTMLElement,
    handlers: HotspotHandlers,
  ) {
    this.sceneManager = sceneManager;
    this.camera = camera;
    this.element = element;
    this.handlers = handlers;

    this.navTexture = createHotspotTexture();
    this.navMaterial = new SpriteMaterial({
      map: this.navTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.infoTexture = createInfoTexture();
    this.infoMaterial = new SpriteMaterial({
      map: this.infoTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.sceneManager.add(this.group);
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointercancel', this.onPointerCancel);
    element.addEventListener('pointermove', this.onPointerMove);
  }

  /** Rebuild markers for the panorama that just became active. */
  public setContent(links: PanoramaLink[], infoSpots: InfoSpot[] = []): void {
    this.clearHotspots();
    const { distance, size } = viewerConfig.hotspot;
    for (const link of links) {
      const hotspot = new Hotspot(link, this.navMaterial, distance, size, {
        kind: 'nav',
        targetId: link.targetId,
        label: link.label ?? '',
      });
      this.navHotspots.push(hotspot);
      this.group.add(hotspot.sprite);
    }
    const info = viewerConfig.infospot;
    for (const spot of infoSpots) {
      const hotspot = new Hotspot(spot, this.infoMaterial, info.distance, info.size, {
        kind: 'info',
        video: spot.video,
        label: spot.label ?? '',
      });
      this.infoHotspots.push(hotspot);
      this.group.add(hotspot.sprite);
    }
  }

  /** Show/hide and enable/disable all markers at once (off while video plays). */
  public setActive(active: boolean): void {
    this.enabled = active;
    this.group.visible = active;
    if (!active) {
      this.press = null;
      this.multiTouch = false;
      this.element.style.cursor = '';
    }
  }

  /** Drive the breathing animation; called once per frame. */
  public update(deltaSeconds: number): void {
    if (!this.enabled) return;
    if (this.navHotspots.length === 0 && this.infoHotspots.length === 0) return;
    this.refreshIconAspect();
    this.elapsed += deltaSeconds;
    const nav = viewerConfig.hotspot;
    const navFactor = 1 + Math.sin(this.elapsed * nav.pulseSpeed) * nav.pulseAmplitude;
    for (const hotspot of this.navHotspots) hotspot.setPulse(navFactor, this.iconAspect);
    const info = viewerConfig.infospot;
    const infoFactor = 1 + Math.sin(this.elapsed * info.pulseSpeed) * info.pulseAmplitude;
    // Info badge texture is square, so its aspect is a flat 1.
    for (const hotspot of this.infoHotspots) hotspot.setPulse(infoFactor, 1);
  }

  public dispose(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerCancel);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.clearHotspots();
    this.sceneManager.remove(this.group);
    this.navMaterial.dispose();
    this.navTexture.dispose();
    this.infoMaterial.dispose();
    this.infoTexture.dispose();
  }

  private clearHotspots(): void {
    for (const hotspot of this.navHotspots) hotspot.dispose();
    for (const hotspot of this.infoHotspots) hotspot.dispose();
    this.navHotspots = [];
    this.infoHotspots = [];
  }

  /** The nav marker image loads asynchronously; latch its true aspect ratio once
   * the pixels are in, so a non-square icon renders undistorted. */
  private refreshIconAspect(): void {
    if (this.iconAspect !== 1) return;
    const image = this.navTexture.image as { width?: number; height?: number } | undefined;
    if (image?.width && image.height) {
      this.iconAspect = image.width / image.height;
    }
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    if (this.press) {
      this.multiTouch = true;
      return;
    }
    this.press = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: event.timeStamp,
    };
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.enabled) return;
    const press = this.press;
    this.press = null;
    if (this.multiTouch) {
      this.multiTouch = false;
      return;
    }
    if (!press || press.id !== event.pointerId) return;

    const travel = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (travel > viewerConfig.hotspot.tapThreshold) return;
    // A long press is a hold-to-steer gesture, not a tap — don't navigate.
    if (event.timeStamp - press.time > viewerConfig.hotspot.tapMaxDuration) return;

    this.activate(event.clientX, event.clientY);
  };

  private readonly onPointerCancel = (): void => {
    this.press = null;
    this.multiTouch = false;
  };

  /** Hover feedback on devices with a pointer: turn the cursor into a pointer
   * over a marker. Skipped while dragging (a button is held). */
  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.enabled || event.buttons !== 0) return;
    if (this.navHotspots.length === 0 && this.infoHotspots.length === 0) return;
    this.element.style.cursor = this.pick(event.clientX, event.clientY) ? 'pointer' : '';
  };

  /** Dispatch a tap to the right handler based on the hit marker's payload. */
  private activate(clientX: number, clientY: number): void {
    const data = this.pick(clientX, clientY);
    if (!data) return;
    if (data['kind'] === 'nav' && typeof data['targetId'] === 'string') {
      this.handlers.onNavigate(data['targetId']);
    } else if (data['kind'] === 'info' && typeof data['video'] === 'string') {
      const label = data['label'];
      this.handlers.onInfo({
        video: data['video'],
        ...(typeof label === 'string' && label ? { label } : {}),
      });
    }
  }

  /** Returns the `userData` of the front-most marker under the screen point. */
  private pick(clientX: number, clientY: number): Record<string, unknown> | null {
    const rect = this.element.getBoundingClientRect();
    this.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(this.group.children, false);
    const first = intersections[0];
    return first ? first.object.userData : null;
  }
}
