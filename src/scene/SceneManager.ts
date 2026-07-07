import { Object3D, Scene } from 'three';
import type { Disposable } from '@/core/Disposable';

/**
 * Owns the {@link Scene} graph and mediates add/remove so no other module holds
 * the scene directly. Today it carries a single panorama sphere; tomorrow it is
 * the natural home for hotspot layers, lighting for 3D props, VR controllers,
 * etc. — each added/removed through this one seam.
 */
export class SceneManager implements Disposable {
  public readonly scene = new Scene();

  public add(object: Object3D): void {
    this.scene.add(object);
  }

  public remove(object: Object3D): void {
    this.scene.remove(object);
  }

  public dispose(): void {
    this.scene.clear();
  }
}
