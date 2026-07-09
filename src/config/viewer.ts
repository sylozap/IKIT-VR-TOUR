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
    /** Multiplier applied to rotate sensitivity. */
    speed: 1,
    /** Invert horizontal direction. */
    invertX: false,
    /** Invert vertical direction. */
    invertY: false,
    /** Press-and-hold "steer" model: the panorama turns toward the pointer, and
     * the farther the pointer is from the viewport centre the faster it turns.
     * This is the top angular speed (deg/second) reached at the very edge. */
    panMaxSpeed: 130,
    /** Fraction of the half-viewport around the centre with no rotation, so a
     * still press near the middle holds steady instead of drifting. */
    panDeadZone: 0.05,
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
    /** Image used for every marker. Swap this one path to restyle all markers.
     * Served from `public/`, so the path is web-absolute. */
    icon: '/assets/ui/arrow.png',
    /** Distance from the camera (center) at which markers sit, in world units.
     * Must stay well inside {@link sphere.radius}. */
    distance: 200,
    /** Marker size in world units (the height; width follows the image aspect).
     * Constant size reads like physical signage. */
    size: 60,
    /** Breathing animation depth, as a fraction of `size`. */
    pulseAmplitude: 0.12,
    pulseSpeed: 2.5,
    /** Max pointer travel (px) between press and release still counted as a tap,
     * so navigation never fires at the end of a look-around drag. */
    tapThreshold: 8,
    /** Max press duration (ms) still counted as a tap, so holding to steer the
     * panorama never fires navigation on release. */
    tapMaxDuration: 300,
  },

  /** On-screen button pad (zoom + fine stepwise pan). */
  buttons: {
    /** FOV change per zoom-button press, in degrees. */
    zoomStep: 6,
    /** Yaw/pitch change per arrow-button press, in degrees. */
    panStep: 8,
    /** While a button is held, repeat the step every this-many milliseconds. */
    repeatInterval: 90,
  },

  infospot: {
    /** Marker size in world units (the height). Info badges are square. */
    size: 55,
    /** Same projection distance as nav markers so both sit on one shell. */
    distance: 200,
    /** Breathing animation, matched to nav markers but a touch calmer. */
    pulseAmplitude: 0.1,
    pulseSpeed: 2,
    /** Diameter of the procedurally-drawn badge texture, in pixels. */
    textureSize: 256,
    /** Badge fill; the play glyph is drawn white on top. */
    color: '#4f8cff',
  },

  minimap: {
    /** Direction of camera yaw on the map. If the view cone turns the *wrong*
     * way when you look around, flip this to -1. (Sign is global for the floor;
     * per-scene aim is set by `northOffset` in the floorplan config.) */
    yawSign: -1,
    /** Length of the view-direction cone, in floor viewBox units. */
    coneRadius: 30,
    /** Half-width of the cone, in degrees. */
    coneHalfAngle: 32,
    /** Radius of an ordinary point dot / the highlighted current dot. */
    pointRadius: 4.5,
    currentPointRadius: 6,
  },
} as const;

export type ViewerConfig = typeof viewerConfig;
