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
  'context:lost': undefined;
  'context:restored': undefined;
};
