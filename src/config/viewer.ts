/**
 * Single source of truth for tunable rendering parameters. No magic numbers are
 * allowed to leak into the engine classes — they all read from here, which
 * makes the viewer trivially re-skinnable and, later, server-configurable.
 */
export const viewerConfig = {
  fov: {
    /** Field of view the camera starts with, in degrees. */
    default: 75,
    min: 40,
    max: 90,
  },

  /** Vertical look limit so the user can never roll over the poles, in degrees. */
  pitchLimit: 85,

  rotation: {
    /** Multiplier applied to drag-to-rotate sensitivity. */
    speed: 1,
    /** Invert horizontal drag direction. */
    invertX: false,
    /** Invert vertical drag direction. */
    invertY: false,
  },

  zoom: {
    /** Degrees of FOV change per wheel notch. */
    wheelSpeed: 0.04,
    /** Degrees of FOV change per pixel of pinch distance. */
    pinchSpeed: 0.1,
  },

  /** Exponential damping rates (higher = less inertia, snappier response). */
  damping: {
    rotation: 10,
    zoom: 10,
  },

  /** Geometry of the projection sphere. The radius is arbitrary (we sit at its
   * center) but the segment counts trade memory for a rounder silhouette. */
  sphere: {
    radius: 500,
    widthSegments: 64,
    heightSegments: 48,
  },

  /** Upper bound for devicePixelRatio. Retina/4K phones report 3–4, which
   * quadruples the fragment count for no perceptible gain — cap it. */
  maxPixelRatio: 2,

  hotspot: {
    /** Distance from the camera (center) at which markers sit, in world units.
     * Must stay well inside {@link sphere.radius}. */
    distance: 200,
    /** Marker size in world units. Constant size reads like physical signage. */
    size: 26,
    /** Breathing animation depth, as a fraction of `size`. */
    pulseAmplitude: 0.12,
    pulseSpeed: 2.5,
    /** Max pointer travel (px) between press and release still counted as a tap,
     * so navigation never fires at the end of a look-around drag. */
    tapThreshold: 8,
  },
} as const;

export type ViewerConfig = typeof viewerConfig;
