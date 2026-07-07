import {
  type PerspectiveCamera,
  Group,
  Raycaster,
  SpriteMaterial,
  type Texture,
  Vector2,
} from 'three';
import type { Disposable } from '@/core/Disposable';
import type { PanoramaLink } from '@/core/types';
import type { SceneManager } from '@/scene/SceneManager';
import { viewerConfig } from '@/config/viewer';
import { createHotspotTexture } from './hotspotTexture';
import { Hotspot } from './Hotspot';

export type HotspotActivateHandler = (targetId: string) => void;

/**
 * Renders the current panorama's navigation links as clickable 3D markers and
 * turns a tap/click on one into an activation callback.
 *
 * Responsibilities kept here (and nowhere else):
 *  - a single {@link Group} added to the scene once and rebuilt per panorama;
 *  - shared marker {@link Texture}/{@link SpriteMaterial}, disposed on teardown;
 *  - pointer hit-testing via {@link Raycaster}, with **tap-vs-drag**
 *    discrimination so a marker never fires at the end of a look-around drag.
 *
 * It never decides what a link *does* — it only reports `targetId` upward; the
 * app resolves navigation. This keeps the layer reusable for non-navigation
 * hotspots (info points, media) later.
 */
export class HotspotLayer implements Disposable {
  private readonly group = new Group();
  private readonly camera: PerspectiveCamera;
  private readonly element: HTMLElement;
  private readonly sceneManager: SceneManager;
  private readonly onActivate: HotspotActivateHandler;

  private readonly texture: Texture;
  private readonly material: SpriteMaterial;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();

  private hotspots: Hotspot[] = [];
  private elapsed = 0;

  /** The candidate press being tracked for tap detection. */
  private press: { id: number; x: number; y: number } | null = null;
  /** A second simultaneous pointer cancels the candidate (pinch, not tap). */
  private multiTouch = false;

  constructor(
    sceneManager: SceneManager,
    camera: PerspectiveCamera,
    element: HTMLElement,
    onActivate: HotspotActivateHandler,
  ) {
    this.sceneManager = sceneManager;
    this.camera = camera;
    this.element = element;
    this.onActivate = onActivate;

    this.texture = createHotspotTexture();
    this.material = new SpriteMaterial({
      map: this.texture,
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
  public setLinks(links: PanoramaLink[]): void {
    this.clearHotspots();
    const { distance, size } = viewerConfig.hotspot;
    for (const link of links) {
      const hotspot = new Hotspot(link, this.material, distance, size);
      this.hotspots.push(hotspot);
      this.group.add(hotspot.sprite);
    }
  }

  /** Drive the breathing animation; called once per frame. */
  public update(deltaSeconds: number): void {
    if (this.hotspots.length === 0) return;
    this.elapsed += deltaSeconds;
    const { pulseAmplitude, pulseSpeed } = viewerConfig.hotspot;
    const factor = 1 + Math.sin(this.elapsed * pulseSpeed) * pulseAmplitude;
    for (const hotspot of this.hotspots) hotspot.setPulse(factor);
  }

  public dispose(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerCancel);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.clearHotspots();
    this.sceneManager.remove(this.group);
    this.material.dispose();
    this.texture.dispose();
  }

  private clearHotspots(): void {
    for (const hotspot of this.hotspots) hotspot.dispose();
    this.hotspots = [];
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.press) {
      this.multiTouch = true;
      return;
    }
    this.press = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const press = this.press;
    this.press = null;
    if (this.multiTouch) {
      this.multiTouch = false;
      return;
    }
    if (!press || press.id !== event.pointerId) return;

    const travel = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (travel > viewerConfig.hotspot.tapThreshold) return;

    const hit = this.pick(event.clientX, event.clientY);
    if (hit) this.onActivate(hit);
  };

  private readonly onPointerCancel = (): void => {
    this.press = null;
    this.multiTouch = false;
  };

  /** Hover feedback on devices with a pointer: turn the cursor into a pointer
   * over a marker. Skipped while dragging (a button is held). */
  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.buttons !== 0 || this.hotspots.length === 0) return;
    this.element.style.cursor = this.pick(event.clientX, event.clientY) ? 'pointer' : '';
  };

  /** Returns the `targetId` of the front-most marker under the screen point. */
  private pick(clientX: number, clientY: number): string | null {
    const rect = this.element.getBoundingClientRect();
    this.pointer.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersections = this.raycaster.intersectObjects(this.group.children, false);
    const first = intersections[0];
    if (!first) return null;
    const targetId = first.object.userData['targetId'];
    return typeof targetId === 'string' ? targetId : null;
  }
}
