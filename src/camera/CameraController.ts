import { PerspectiveCamera, Vector3 } from 'three';
import { clamp, damp, degToRad, radToDeg } from '@/utils/math';
import { viewerConfig } from '@/config/viewer';

/**
 * Owns the {@link PerspectiveCamera} and the only mutable orientation state in
 * the renderer: yaw, pitch and FOV.
 *
 * Design: every input writes to a *target* (`targetYaw`, `targetPitch`,
 * `targetFov`) while {@link update} eases the *current* value toward it with
 * frame-rate independent damping. This decouples input frequency from render
 * frequency and gives the "weighty", smooth feel for free — controls never
 * touch the camera matrix directly.
 *
 * Internally everything is radians; the public `setOrientation` accepts degrees
 * to match the {@link PanoramaNode} authoring model.
 */
export class CameraController {
  public readonly camera: PerspectiveCamera;

  private currentYaw = 0;
  private targetYaw = 0;
  private currentPitch = 0;
  private targetPitch = 0;
  private currentFov: number;
  private targetFov: number;

  private readonly pitchLimit = degToRad(viewerConfig.pitchLimit);
  private readonly minFov = viewerConfig.fov.min;
  private readonly maxFov = viewerConfig.fov.max;

  /** Scratch vector reused every frame to avoid per-frame allocation. */
  private readonly lookTarget = new Vector3();

  constructor(aspect: number) {
    this.currentFov = viewerConfig.fov.default;
    this.targetFov = viewerConfig.fov.default;
    this.camera = new PerspectiveCamera(this.currentFov, aspect, 0.1, viewerConfig.sphere.radius * 2);
    this.camera.position.set(0, 0, 0);
  }

  /** Apply a relative look delta, in radians (already sensitivity-scaled by the
   * controls). Pitch is clamped to the configured limit. */
  public rotate(deltaYaw: number, deltaPitch: number): void {
    this.targetYaw += deltaYaw;
    this.targetPitch = clamp(this.targetPitch + deltaPitch, -this.pitchLimit, this.pitchLimit);
  }

  /** Apply a relative FOV delta, in degrees. */
  public zoom(deltaFov: number): void {
    this.targetFov = clamp(this.targetFov + deltaFov, this.minFov, this.maxFov);
  }

  /** Current effective FOV in degrees — controls scale their sensitivity by it. */
  public get fov(): number {
    return this.currentFov;
  }

  /** Current eased yaw in degrees — read by the minimap direction cone. */
  public get yawDegrees(): number {
    return radToDeg(this.currentYaw);
  }

  /**
   * Jump or ease to an absolute orientation (degrees). `instant` is used when a
   * new panorama appears so we don't sweep the camera across the old image.
   */
  public setOrientation(yawDegrees: number, pitchDegrees: number, instant = false): void {
    this.targetYaw = degToRad(yawDegrees);
    this.targetPitch = clamp(degToRad(pitchDegrees), -this.pitchLimit, this.pitchLimit);
    if (instant) {
      this.currentYaw = this.targetYaw;
      this.currentPitch = this.targetPitch;
    }
  }

  public setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Advance the easing and rebuild the camera basis. Called once per frame. */
  public update(deltaSeconds: number): void {
    const { rotation, zoom } = viewerConfig.damping;
    this.currentYaw = damp(this.currentYaw, this.targetYaw, rotation, deltaSeconds);
    this.currentPitch = damp(this.currentPitch, this.targetPitch, rotation, deltaSeconds);
    this.currentFov = damp(this.currentFov, this.targetFov, zoom, deltaSeconds);

    // Spherical look direction: yaw rotates around Y, pitch lifts toward +Y.
    const cosPitch = Math.cos(this.currentPitch);
    this.lookTarget.set(
      cosPitch * Math.sin(this.currentYaw),
      Math.sin(this.currentPitch),
      cosPitch * Math.cos(this.currentYaw),
    );
    this.camera.lookAt(this.lookTarget);

    if (this.camera.fov !== this.currentFov) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }
}
