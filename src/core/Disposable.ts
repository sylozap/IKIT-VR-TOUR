/**
 * Anything that owns non-GC-managed resources (GPU buffers, textures, DOM
 * listeners, timers) implements this so ownership chains can be torn down
 * deterministically from the top.
 */
export interface Disposable {
  dispose(): void;
}
