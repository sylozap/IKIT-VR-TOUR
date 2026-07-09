import type { Disposable } from '@/core/Disposable';
import type { CameraController } from '@/camera/CameraController';
import { PointerControls } from './PointerControls';
import { WheelControls } from './WheelControls';

/**
 * Aggregates the individual input strategies behind one lifecycle. The Viewer
 * depends only on this facade, so new input sources (gamepad, keyboard, gyro,
 * VR controllers) can be added here without touching the Viewer.
 */
interface Control extends Disposable {
  setEnabled(enabled: boolean): void;
  /** Optional per-frame hook for controls that integrate over time (steering). */
  update?(deltaSeconds: number): void;
}

export class ControlsManager implements Disposable {
  private readonly controls: Control[];

  constructor(element: HTMLElement, camera: CameraController) {
    this.controls = [new PointerControls(element, camera), new WheelControls(element, camera)];
  }

  public setEnabled(enabled: boolean): void {
    for (const control of this.controls) control.setEnabled(enabled);
  }

  /** Advance time-based controls; called once per frame by the viewer. */
  public update(deltaSeconds: number): void {
    for (const control of this.controls) control.update?.(deltaSeconds);
  }

  public dispose(): void {
    for (const control of this.controls) control.dispose();
  }
}
