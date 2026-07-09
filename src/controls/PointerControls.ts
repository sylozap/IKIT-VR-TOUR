import type { Disposable } from '@/core/Disposable';
import type { CameraController } from '@/camera/CameraController';
import { clamp, degToRad } from '@/utils/math';
import { viewerConfig } from '@/config/viewer';

const ARROW_SVG =
  `<svg viewBox="0 0 24 24" aria-hidden="true">` +
  `<path d="M4 12h13M12 6l6 6-6 6"/></svg>`;

/**
 * Press-and-hold "steering" controls. Instead of dragging the image, the user
 * presses anywhere and the panorama turns **toward that side of the screen** —
 * the farther the press is from the centre, the faster it turns — and keeps
 * turning while the button is held, even without moving. A directional arrow
 * replaces the cursor to show which way (and, by its offset, roughly how fast).
 *
 * Pointer Events unify mouse, touch and pen, so one implementation drives desktop
 * and mobile; a two-finger gesture is routed to pinch-zoom instead of steering.
 *
 * Rotation is applied per frame from {@link update}: each frame the pointer's
 * offset from centre is turned into an angular velocity and integrated with the
 * frame delta, which keeps the turn rate smooth and frame-rate independent.
 */
export class PointerControls implements Disposable {
  private readonly element: HTMLElement;
  private readonly camera: CameraController;
  private readonly cursor: HTMLDivElement;

  /** Active pointers by id → last known position. Drives steer vs. pinch. */
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchDistance = 0;
  private enabled = true;
  /** The pointer currently steering (single-pointer press), if any. */
  private steerId: number | null = null;
  private steerIsMouse = false;

  constructor(element: HTMLElement, camera: CameraController) {
    this.element = element;
    this.camera = camera;

    this.cursor = document.createElement('div');
    this.cursor.className = 'vt-steer-cursor';
    this.cursor.innerHTML = ARROW_SVG;
    this.cursor.hidden = true;
    element.appendChild(this.cursor);

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
      this.stopSteering();
    }
  }

  public dispose(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    this.element.removeEventListener('pointermove', this.onPointerMove);
    this.element.removeEventListener('pointerup', this.onPointerUp);
    this.element.removeEventListener('pointercancel', this.onPointerUp);
    this.stopSteering();
    this.cursor.remove();
    this.pointers.clear();
  }

  /** Integrate the current steer velocity; called once per frame by the viewer. */
  public update(deltaSeconds: number): void {
    if (this.steerId === null || this.pointers.size !== 1) return;
    const pos = this.pointers.get(this.steerId);
    if (!pos) return;

    const rect = this.element.getBoundingClientRect();
    const nx = clamp((pos.x - (rect.left + rect.width / 2)) / (rect.width / 2), -1, 1);
    const ny = clamp((pos.y - (rect.top + rect.height / 2)) / (rect.height / 2), -1, 1);
    if (Math.hypot(nx, ny) < viewerConfig.rotation.panDeadZone) return;

    const { speed, invertX, invertY, panMaxSpeed } = viewerConfig.rotation;
    const maxRate = degToRad(panMaxSpeed) * speed * deltaSeconds;
    // Turn toward the press: right of centre → look right (yaw decreases), below
    // centre → look down (pitch decreases).
    const yaw = -nx * maxRate * (invertX ? -1 : 1);
    const pitch = -ny * maxRate * (invertY ? -1 : 1);
    this.camera.rotate(yaw, pitch);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.enabled) return;
    this.element.setPointerCapture(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 1) {
      this.steerId = event.pointerId;
      this.steerIsMouse = event.pointerType === 'mouse';
      this.updateCursor(event.clientX, event.clientY);
    } else if (this.pointers.size === 2) {
      // A second finger switches from steering to pinch-zoom.
      this.stopSteering();
      this.pinchDistance = this.currentPinchDistance();
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.enabled) return;
    const previous = this.pointers.get(event.pointerId);
    if (!previous) return;
    previous.x = event.clientX;
    previous.y = event.clientY;

    if (this.pointers.size >= 2) {
      this.handlePinch();
    } else if (this.steerId === event.pointerId) {
      this.updateCursor(event.clientX, event.clientY);
    }
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);
    if (this.element.hasPointerCapture(event.pointerId)) {
      this.element.releasePointerCapture(event.pointerId);
    }

    if (event.pointerId === this.steerId) this.stopSteering();
    if (this.pointers.size < 2) this.pinchDistance = 0;
    // A single finger left after a pinch resumes steering with it.
    if (this.pointers.size === 1) {
      const id = [...this.pointers.keys()][0];
      const pos = id === undefined ? undefined : this.pointers.get(id);
      if (id !== undefined && pos) {
        this.steerId = id;
        this.updateCursor(pos.x, pos.y);
      }
    }
  };

  /** Point the arrow from the viewport centre toward the pointer (mouse only). */
  private updateCursor(x: number, y: number): void {
    if (!this.steerIsMouse) return;
    const rect = this.element.getBoundingClientRect();
    const dx = x - (rect.left + rect.width / 2);
    const dy = y - (rect.top + rect.height / 2);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    this.cursor.style.transform =
      `translate(${x - rect.left}px, ${y - rect.top}px) translate(-50%, -50%) rotate(${angle}deg)`;
    this.cursor.hidden = false;
    this.element.style.cursor = 'none';
  }

  private stopSteering(): void {
    this.steerId = null;
    this.steerIsMouse = false;
    this.cursor.hidden = true;
    this.element.style.cursor = '';
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
