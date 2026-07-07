import type { Disposable } from '@/core/Disposable';
import type { CameraController } from '@/camera/CameraController';
import { PointerControls } from './PointerControls';
import { WheelControls } from './WheelControls';

/**
 * Aggregates the individual input strategies behind one lifecycle. The Viewer
 * depends only on this facade, so new input sources (gamepad, keyboard, gyro,
 * VR controllers) can be added here without touching the Viewer.
 */
export class ControlsManager implements Disposable {
  private readonly controls: Array<Disposable & { setEnabled(enabled: boolean): void }>;

  constructor(element: HTMLElement, camera: CameraController) {
    this.controls = [new PointerControls(element, camera), new WheelControls(element, camera)];
  }

  public setEnabled(enabled: boolean): void {
    for (const control of this.controls) control.setEnabled(enabled);
  }

  public dispose(): void {
    for (const control of this.controls) control.dispose();
  }
}
