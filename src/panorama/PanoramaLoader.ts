import { SRGBColorSpace, Texture } from 'three';

/**
 * Loads an equirectangular image into a GPU-ready {@link Texture}.
 *
 * Why not `THREE.TextureLoader`? It offers no way to cancel an in-flight
 * request. Here the network fetch is driven by `fetch(..., { signal })`, so a
 * panorama swap or a `dispose()` can `abort()` a load that is no longer needed
 * — essential when racing across "hundreds of panoramas" on a flaky mobile
 * connection. The decoded image is uploaded lazily by three on the next render.
 */
export class PanoramaLoader {
  private readonly maxAnisotropy: number;

  constructor(maxAnisotropy: number) {
    this.maxAnisotropy = maxAnisotropy;
  }

  public async load(url: string, signal: AbortSignal): Promise<Texture> {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Failed to load panorama "${url}": ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = await this.decode(objectUrl, signal);
      const texture = new Texture(image);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = this.maxAnisotropy;
      texture.needsUpdate = true;
      return texture;
    } finally {
      // Safe to revoke once decoded: the bitmap now lives in the image element.
      URL.revokeObjectURL(objectUrl);
    }
  }

  private decode(objectUrl: string, signal: AbortSignal): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(this.abortError());
        return;
      }
      const image = new Image();
      image.decoding = 'async';

      const onAbort = (): void => {
        image.src = '';
        reject(this.abortError());
      };
      signal.addEventListener('abort', onAbort, { once: true });

      image.onload = (): void => {
        signal.removeEventListener('abort', onAbort);
        resolve(image);
      };
      image.onerror = (): void => {
        signal.removeEventListener('abort', onAbort);
        reject(new Error('Panorama image failed to decode'));
      };
      image.src = objectUrl;
    });
  }

  private abortError(): DOMException {
    return new DOMException('Panorama load aborted', 'AbortError');
  }
}
