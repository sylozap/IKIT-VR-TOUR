import type { Disposable } from '@/core/Disposable';
import type { CameraController } from '@/camera/CameraController';
import { viewerConfig } from '@/config/viewer';

/** Maps desktop mouse-wheel deltas to FOV changes (zoom). */
export class WheelControls implements Disposable {
  private readonly element: HTMLElement;
  private readonly camera: CameraController;
  private enabled = true;

  constructor(element: HTMLElement, camera: CameraController) {
    this.element = element;
    this.camera = camera;
    element.addEventListener('wheel', this.onWheel, { passive: false });
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public dispose(): void {
    this.element.removeEventListener('wheel', this.onWheel);
  }

  private readonly onWheel = (event: WheelEvent): void => {
    if (!this.enabled) return;
    // Stop the page from scrolling under the canvas.
    event.preventDefault();
    this.camera.zoom(event.deltaY * viewerConfig.zoom.wheelSpeed);
  };
}
