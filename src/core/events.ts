import type { PanoramaNode } from './types';

/**
 * The public event contract emitted by the {@link Viewer}. Anything outside the
 * rendering core (UI, analytics, audio guide, …) observes these instead of
 * reaching into the viewer internals.
 */
export type ViewerEvents = {
  'panorama:loadstart': { id: string };
  'panorama:loaded': { node: PanoramaNode };
  'panorama:error': { id: string; error: unknown };
  /** Fired when the user activates a navigation hotspot. */
  'link:activated': { targetId: string };
  /** Fired when the user taps a 360°-video info marker. */
  'infospot:activated': { video: string; label?: string };
  /** Fired when the user asks to close the playing 360° video (UI intent). */
  'video:close': undefined;
  /** A 360° video began playing on the sphere. */
  'video:started': { label?: string };
  /** The 360° video ended, was closed, or failed; the scene is back. */
  'video:stopped': undefined;
  'context:lost': undefined;
  'context:restored': undefined;
};
