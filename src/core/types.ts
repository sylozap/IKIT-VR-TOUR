/**
 * Domain model for the tour graph.
 *
 * The model is intentionally designed for hundreds of nodes from day one: a
 * panorama is a *node* in a directed graph, and a link is a directed edge that
 * also carries the screen-space position (yaw/pitch) where its hotspot should
 * be drawn. This is enough to express floors, rooms and arbitrary navigation
 * without changing the schema — only the data source grows.
 *
 * Angles are expressed in **degrees** because this data is authored by humans
 * (and, later, by a CMS). They are converted to radians at the rendering
 * boundary (see {@link CameraController}).
 */

export interface PanoramaLink {
  /** Id of the {@link PanoramaNode} this link navigates to. */
  targetId: string;
  /** Horizontal angle of the hotspot, in degrees. */
  yaw: number;
  /** Vertical angle of the hotspot, in degrees. */
  pitch: number;
  /** Optional human-readable label, used by tooltips / accessibility. */
  label?: string;
}

/**
 * A non-navigation marker: tapping it plays an equirectangular 360° video in
 * place of the panorama, then returns to the scene when the clip ends or is
 * closed. Placement uses the same yaw/pitch basis as {@link PanoramaLink}.
 */
export interface InfoSpot {
  /** Horizontal angle of the marker, in degrees. */
  yaw: number;
  /** Vertical angle of the marker, in degrees. */
  pitch: number;
  /** URL of the equirectangular (2:1) 360° video, served from `public/`. */
  video: string;
  /** Optional caption shown while the video plays. */
  label?: string;
}

export interface PanoramaNode {
  id: string;
  title: string;
  /** URL of the equirectangular (2:1) source image. */
  image: string;
  /** Yaw the camera faces right after this panorama is shown, in degrees. */
  initialYaw: number;
  /** Pitch the camera faces right after this panorama is shown, in degrees. */
  initialPitch: number;
  /** Outgoing navigation links. May be empty. */
  links: PanoramaLink[];
  /** Optional 360° video markers placed in this scene. */
  infoSpots?: InfoSpot[];
}

/** A 2D size in CSS pixels. */
export interface Size {
  width: number;
  height: number;
}
