import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';

/**
 * Builds the navigation-marker texture procedurally on a `<canvas>` so the
 * project ships with zero binary marker assets — the look is fully controlled
 * here (a soft-glowing ring with a center dot). One texture instance is shared
 * by every hotspot; {@link HotspotLayer} owns and disposes it.
 */
export function createHotspotTexture(): Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable for hotspot texture');

  const center = size / 2;

  ctx.shadowColor = 'rgba(79, 140, 255, 0.9)';
  ctx.shadowBlur = 18;

  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.arc(center, center, center - 26, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.arc(center, center, 11, 0, Math.PI * 2);
  ctx.fill();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
