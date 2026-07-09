import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import { viewerConfig } from '@/config/viewer';

/**
 * Draws the info marker as a procedural {@link CanvasTexture} — a filled circular
 * badge with a white "play" triangle — so it needs no external asset and reads
 * unmistakably as "tap to play a video", distinct from the navigation arrows.
 *
 * One texture instance is shared by every info marker; {@link HotspotLayer} owns
 * and disposes it. The badge is square, so its sprite aspect is a flat 1.
 */
export function createInfoTexture(): Texture {
  const { textureSize: s, color } = viewerConfig.infospot;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable for info marker');

  const c = s / 2;
  const r = s * 0.42;

  // Soft outer ring for contrast against any panorama.
  ctx.beginPath();
  ctx.arc(c, c, r + s * 0.04, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 10, 12, 0.45)';
  ctx.fill();

  // Badge disc.
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = s * 0.03;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.stroke();

  // Play triangle, optically centred (nudged right of the geometric centre).
  const t = r * 0.5;
  ctx.beginPath();
  ctx.moveTo(c - t * 0.6, c - t);
  ctx.lineTo(c - t * 0.6, c + t);
  ctx.lineTo(c + t, c);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
