import type { Disposable } from '@/core/Disposable';
import type { CameraController } from '@/camera/CameraController';
import { degToRad } from '@/utils/math';
import { viewerConfig } from '@/config/viewer';

/**
 * Translates Pointer Events into camera commands. Pointer Events unify mouse,
 * touch and pen, so a single implementation serves desktop drag *and* mobile —
 * with a two-finger pinch routed to zoom.
 *
 * Rotation uses an "angle-per-pixel" model derived from the current vertical
 * FOV and viewport height, so dragging feels 1:1 with the image regardless of
 * zoom level, then is multiplied by the configured sensitivity.
 */
export class PointerControls implements Disposable {
  private readonly element: HTMLElement;
  private readonly camera: CameraController;

  /** Active pointers by id → last known position. Drives drag vs. pinch. */
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDistance = 0;
  private enabled = true;

  constructor(element: HTMLElement, camera: CameraController) {
    this.element = element;
    this.camera = camera;
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointercancel', this.onPointerUp);
    // Block native touch panning/zoom so the canvas owns the gesture.
    element.style.touchAction = 'none';
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.pointers.clear();
      this.pinchDistance = 0;
    }
  }

  public dispose(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerUp);
    this.pointers.clear();
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    this.element.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 2) {
      this.pinchDistance = this.currentPinchDistance();
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.enabled) return;
    const previous = this.pointers.get(event.pointerId);
    if (!previous) return;

    if (this.pointers.size >= 2) {
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.handlePinch();
      return;
    }

    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    previous.x = event.clientX;
    previous.y = event.clientY;
    this.handleDrag(dx, dy);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);
    if (this.element.hasPointerCapture(event.pointerId)) {
      this.element.releasePointerCapture(event.pointerId);
    }
    if (this.pointers.size < 2) {
      this.pinchDistance = 0;
    }
  };

  private handleDrag(dx: number, dy: number): void {
    const { speed, invertX, invertY } = viewerConfig.rotation;
    const anglePerPixel = degToRad(this.camera.fov) / this.element.clientHeight;
    const factor = anglePerPixel * speed;
    // Drag right → look right (yaw decreases in our left-handed look basis).
    const yaw = -dx * factor * (invertX ? -1 : 1);
    const pitch = dy * factor * (invertY ? -1 : 1);
    this.camera.rotate(yaw, pitch);
  }

  private handlePinch(): void {
    const distance = this.currentPinchDistance();
    if (this.pinchDistance > 0) {
      const delta = this.pinchDistance - distance;
      this.camera.zoom(delta * viewerConfig.zoom.pinchSpeed);
    }
    this.pinchDistance = distance;
  }

  private currentPinchDistance(): number {
    const points = [...this.pointers.values()];
    const a = points[0];
    const b = points[1];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
