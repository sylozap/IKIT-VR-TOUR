import { TextureLoader, SRGBColorSpace, type Texture } from 'three';
import { viewerConfig } from '@/config/viewer';

/**
 * Loads the shared navigation-marker image. One texture instance is shared by
 * every hotspot; {@link HotspotLayer} owns and disposes it. To restyle every
 * marker at once, change `viewerConfig.hotspot.icon` (or swap this function for
 * a procedural `CanvasTexture`).
 *
 * The image loads asynchronously; its natural aspect ratio is read from
 * `texture.image` by {@link HotspotLayer} once available so the sprite is never
 * distorted.
 */
export function createHotspotTexture(): Texture {
  const texture = new TextureLoader().load(viewerConfig.hotspot.icon);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
