import { Sprite, type SpriteMaterial, Vector3 } from 'three';
import type { Disposable } from '@/core/Disposable';
import type { PanoramaLink } from '@/core/types';
import { degToRad } from '@/utils/math';

/**
 * One navigation marker: a billboard {@link Sprite} placed in 3D at the link's
 * `yaw`/`pitch`. The placement basis is identical to {@link CameraController}'s
 * look basis, so a link with the same angles the camera is facing appears dead
 * center — the two stay in sync by construction.
 *
 * The material/texture are shared and owned by {@link HotspotLayer}; a hotspot
 * therefore disposes nothing GPU-side, only detaches its sprite.
 */
export class Hotspot implements Disposable {
  public readonly sprite: Sprite;
  public readonly targetId: string;
  private readonly baseSize: number;

  constructor(link: PanoramaLink, material: SpriteMaterial, distance: number, size: number) {
    this.targetId = link.targetId;
    this.baseSize = size;

    const yaw = degToRad(link.yaw);
    const pitch = degToRad(link.pitch);
    const cosPitch = Math.cos(pitch);
    const direction = new Vector3(
      cosPitch * Math.sin(yaw),
      Math.sin(pitch),
      cosPitch * Math.cos(yaw),
    );

    this.sprite = new Sprite(material);
    this.sprite.position.copy(direction.multiplyScalar(distance));
    this.sprite.scale.setScalar(size);
    // Always draw markers on top of the panorama sphere.
    this.sprite.renderOrder = 10;
    this.sprite.userData.targetId = link.targetId;
    this.sprite.userData.label = link.label ?? '';
  }

  /** `factor` is the current pulse multiplier around 1.0. */
  public setPulse(factor: number): void {
    this.sprite.scale.setScalar(this.baseSize * factor);
  }

  public dispose(): void {
    this.sprite.removeFromParent();
  }
}
