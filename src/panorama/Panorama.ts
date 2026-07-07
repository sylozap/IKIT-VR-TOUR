import { Mesh, MeshBasicMaterial, SphereGeometry, type Texture } from 'three';
import type { Disposable } from '@/core/Disposable';
import { viewerConfig } from '@/config/viewer';

/**
 * A single projection sphere with the panorama mapped on its inside.
 *
 * `geometry.scale(-1, 1, 1)` flips the sphere inside-out so its texture faces
 * the camera at the center — cheaper and more correct than rendering back faces
 * via `side: BackSide` because culling still removes the now-front faces.
 *
 * Crucially this class owns exactly three GPU resources (texture, geometry,
 * material) and frees all of them in {@link dispose}. Forgetting any one of
 * them leaks VRAM on every panorama transition — the fastest way to crash a
 * long mobile tour.
 */
export class Panorama implements Disposable {
  public readonly mesh: Mesh;
  private readonly geometry: SphereGeometry;
  private readonly material: MeshBasicMaterial;
  private readonly texture: Texture;

  constructor(texture: Texture) {
    this.texture = texture;
    const { radius, widthSegments, heightSegments } = viewerConfig.sphere;
    this.geometry = new SphereGeometry(radius, widthSegments, heightSegments);
    this.geometry.scale(-1, 1, 1);
    this.material = new MeshBasicMaterial({ map: texture });
    this.mesh = new Mesh(this.geometry, this.material);
    // The sphere is the world background — never frustum-cull or depth-test it out.
    this.mesh.frustumCulled = false;
  }

  /** Re-flag the texture for GPU upload, e.g. after a WebGL context restore. */
  public refresh(): void {
    this.texture.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  }
}
