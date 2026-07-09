import { Sprite, type SpriteMaterial, Vector3 } from 'three';
import type { Disposable } from '@/core/Disposable';
import { degToRad } from '@/utils/math';

/** Where a marker sits, in the same yaw/pitch basis as the camera look. */
export interface MarkerPlacement {
  yaw: number;
  pitch: number;
}

/**
 * One billboard {@link Sprite} marker placed in 3D at a `yaw`/`pitch`. The
 * placement basis is identical to {@link CameraController}'s look basis, so a
 * marker with the same angles the camera is facing appears dead center — the
 * two stay in sync by construction.
 *
 * It is payload-agnostic: the `userData` handed in (a nav `targetId`, an info
 * `video`, …) is what {@link HotspotLayer} reads back on a hit, which is what
 * lets one layer carry both navigation arrows and 360°-video info markers.
 *
 * The material/texture are shared and owned by {@link HotspotLayer}; a marker
 * therefore disposes nothing GPU-side, only detaches its sprite.
 */
export class Hotspot implements Disposable {
  public readonly sprite: Sprite;
  private readonly baseSize: number;

  constructor(
    placement: MarkerPlacement,
    material: SpriteMaterial,
    distance: number,
    size: number,
    userData: Record<string, unknown>,
  ) {
    this.baseSize = size;

    const yaw = degToRad(placement.yaw);
    const pitch = degToRad(placement.pitch);
    const cosPitch = Math.cos(pitch);
    const direction = new Vector3(
      cosPitch * Math.sin(yaw),
      Math.sin(pitch),
      cosPitch * Math.cos(yaw),
    );

    this.sprite = new Sprite(material);
    this.sprite.position.copy(direction.multiplyScalar(distance));
    this.sprite.scale.set(size, size, 1);
    // Always draw markers on top of the panorama sphere.
    this.sprite.renderOrder = 10;
    this.sprite.userData = userData;
  }

  /**
   * `factor` is the current pulse multiplier around 1.0. `aspect` (width/height
   * of the marker image) keeps a non-square icon from stretching: `size` sets
   * the height, width follows the image.
   */
  public setPulse(factor: number, aspect: number): void {
    const height = this.baseSize * factor;
    this.sprite.scale.set(height * aspect, height, 1);
  }

  public dispose(): void {
    this.sprite.removeFromParent();
  }
}
