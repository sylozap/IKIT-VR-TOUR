/**
 * The floor maps drawn by the minimap.
 *
 * This is a **compact, hand-drawn schematic** — not a scale plan. Its only jobs
 * are (1) let the visitor recognise where they are and (2) carry a 2D position
 * for every panorama so the minimap can place a dot and a view-direction cone.
 *
 * Coordinates live in each floor's own `viewBox` space (unitless; the SVG is
 * scaled to the panel). Point `id`s must match {@link PanoramaNode.id} exactly —
 * that is the whole join between a scene and its spot on the map.
 *
 * `northOffset` calibrates the direction cone per scene: it is the map bearing
 * (degrees, clockwise, 0 = map-up) the camera faces when its yaw is 0. Each
 * panorama was shot with an arbitrary "north", so this is tuned once per scene
 * by eye — see README, section "Миникарта и калибровка направления".
 *
 * Сибкодинг lives on another floor and gets its own map later; its scenes simply
 * have no entry here, and the minimap hides itself while they are shown.
 */

export interface FloorRoom {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Optional room caption drawn at the rectangle's centre. */
  label?: string;
}

export interface FloorPoint {
  /** Must equal a {@link PanoramaNode.id}. */
  id: string;
  x: number;
  y: number;
  /** Map bearing (deg, cw, 0 = up) the camera faces at yaw 0. Default 0. */
  northOffset?: number;
}

export interface Floor {
  id: string;
  title: string;
  viewBox: { width: number; height: number };
  /** Background rectangles (corridor + rooms) drawn under the points. */
  rooms: FloorRoom[];
  points: FloorPoint[];
}

// Vertical corridor down the middle. Left column bottom→top: 201, 202, 203,
// лестница. Right column bottom→top: 220, 220А, 219. Rooms are laid on an even
// grid (four equal rows); the top-right cell is empty. Matches Схема.svg.
const floor2: Floor = {
  id: 'floor-2',
  title: '2 этаж',
  viewBox: { width: 220, height: 400 },
  rooms: [
    // Corridor.
    { x: 96, y: 0, width: 28, height: 308 },
    // Left column (top → bottom).
    { x: 42, y: 0, width: 50, height: 50, label: 'лестница' },
    { x: 18, y: 54, width: 74, height: 100, label: '203' },
    { x: 18, y: 158, width: 74, height: 100, label: '202' },
    { x: 18, y: 262, width: 74, height: 100, label: '201' },
    // Right column (top → bottom).
    { x: 128, y: 0, width: 74, height: 100, label: '219' },
    { x: 128, y: 104, width: 74, height: 100, label: '220А' },
    { x: 128, y: 208, width: 74, height: 100, label: '220' },
  ],
  points: [
    // Corridor spine (bottom → top toward the stairs).
    { id: 'Коридор_201_220', x: 110, y: 280, northOffset: 265},
    { id: 'Коридор_202', x: 110, y: 230, northOffset: 180},
    { id: 'Коридор_203', x: 110, y: 160, northOffset: 190},
    { id: 'Коридор_219', x: 110, y: 90, northOffset: 215},
    { id: 'Коридор_перед_лестницей', x: 110, y: 54, northOffset: 215 },
    { id: 'Стенд', x: 80, y: 20, northOffset: 215  },
    { id: 'Сибкодинг', x: 60, y: 25, northOffset: 215  },
    // Room 201 (bottom-left).
    { id: '201_пр_стол', x: 28, y: 280, northOffset: 210 },
    { id: '201_экран', x: 55, y: 280, northOffset: 235 },
    { id: '201_вход', x: 82, y: 280, northOffset: 115 },
    { id: '201_центр', x: 55, y: 314, northOffset: 230 },
    { id: '201_задние_ряды', x: 55, y: 346, northOffset: 170},
    // Room 220 (bottom-right).
    { id: '220_сзади_справа', x: 144, y: 230, northOffset: -15 },
    { id: '220_сзади_слева', x: 184, y: 230, northOffset: 10 },
    { id: '220_экран', x: 158, y: 290, northOffset: 200 },
    { id: '220_стенд', x: 190, y: 290, northOffset: 170 },
    // Room 219 (right, third row).
    { id: '219_экран', x: 150, y: 15, northOffset: 270 },
    { id: '219_вход', x: 150, y: 90, northOffset: -15 },
  ],
};

// Сибкодинг — a separate floor reached by the stairs from Стенд. One large room
// with a short partition in the upper half; matches Сибкодинг.svg.
const sibcoding: Floor = {
  id: 'sibcoding',
  title: 'Сибкодинг',
  viewBox: { width: 240, height: 152 },
  rooms: [
    { x: 10, y: 10, width: 218, height: 130 }, // outer room
    { x: 118, y: 10, width: 2, height: 64 }, // short inner partition
  ],
  points: [
    { id: 'Сибкодинг_пк_2', x: 98, y: 28, northOffset: 280 },
    { id: 'Сибкодинг_доска', x: 146, y: 28, northOffset: 210 },
    { id: 'Сибкодинг_награды', x: 211, y: 40, northOffset: 210 },
    { id: 'Сибкодинг_пк', x: 31, y: 93, northOffset: 240 },
    { id: 'Сибкодинг_вход', x: 98, y: 122, northOffset: -10 },
    { id: 'Сибкодинг_коридор', x: 146, y: 122, northOffset: 260 },
    { id: 'Сибкодинг_стол', x: 211, y: 122, northOffset: -50 },
  ],
};

export const floors: Floor[] = [floor2, sibcoding];

/** Locate the floor and point a panorama sits on, or `null` if it is unmapped. */
export function findFloorPoint(id: string): { floor: Floor; point: FloorPoint } | null {
  for (const floor of floors) {
    const point = floor.points.find((p) => p.id === id);
    if (point) return { floor, point };
  }
  return null;
}
