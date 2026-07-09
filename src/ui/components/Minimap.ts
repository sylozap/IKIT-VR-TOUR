import type { Disposable } from '@/core/Disposable';
import type { Viewer } from '@/viewer/Viewer';
import { findFloorPoint, type Floor, type FloorPoint } from '@/config/floorplan';
import { viewerConfig } from '@/config/viewer';
import { degToRad } from '@/utils/math';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * A collapsible floor-plan minimap layered over the canvas.
 *
 * It reads the tour purely through the {@link Viewer} event bus: `panorama:loaded`
 * tells it which point to highlight (and, via the floorplan config, on which
 * floor), while a self-owned rAF loop reads {@link Viewer.cameraYaw} each frame to
 * spin the direction cone. Clicking a dot navigates by re-emitting `link:activated`
 * — the same intent a 3D hotspot raises — so the app's navigation policy stays the
 * one and only place that resolves ids to panoramas.
 *
 * Scenes with no map entry (e.g. Сибкодинг) simply hide the panel.
 */
export class Minimap implements Disposable {
  public readonly element: HTMLDivElement;

  private readonly viewer: Viewer;
  private readonly titleLabel: HTMLSpanElement;
  private readonly svg: SVGSVGElement;
  private readonly coneGroup: SVGGElement;
  private readonly unsubscribers: Array<() => void> = [];
  private readonly pointEls = new Map<string, SVGCircleElement>();

  private floor: Floor | null = null;
  private current: FloorPoint | null = null;
  private northOffset = 0;
  private rafId = 0;
  private collapsed = false;

  constructor(viewer: Viewer) {
    this.viewer = viewer;

    this.element = document.createElement('div');
    this.element.className = 'vt-minimap';
    this.element.hidden = true;

    const header = document.createElement('div');
    header.className = 'vt-minimap__header';

    this.titleLabel = document.createElement('span');
    this.titleLabel.className = 'vt-minimap__title';

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'vt-minimap__toggle';
    toggle.setAttribute('aria-label', 'Свернуть карту');
    toggle.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;
    toggle.addEventListener('click', this.onToggle);

    header.append(this.titleLabel, toggle);

    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('class', 'vt-minimap__plan');
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    this.coneGroup = document.createElementNS(SVG_NS, 'g');
    this.coneGroup.setAttribute('class', 'vt-minimap__cone');
    this.coneGroup.appendChild(this.buildConePath());

    this.element.append(header, this.svg);

    // Keep look-around drags, taps and wheel-zoom from leaking to the canvas
    // controls underneath the panel.
    this.element.addEventListener('pointerdown', stopEvent);
    this.element.addEventListener('wheel', stopEvent, { passive: false });

    this.unsubscribers.push(
      viewer.events.on('panorama:loaded', ({ node }) => this.showPanorama(node.id)),
      // A 360° video takes over the whole view; the map has nothing to point at.
      viewer.events.on('video:started', () => this.setHiddenByVideo(true)),
      viewer.events.on('video:stopped', () => this.setHiddenByVideo(false)),
    );
  }

  public dispose(): void {
    this.stopLoop();
    for (const off of this.unsubscribers) off();
    this.element.remove();
  }

  private buildConePath(): SVGPathElement {
    const { coneRadius: r, coneHalfAngle } = viewerConfig.minimap;
    const half = degToRad(coneHalfAngle);
    // Cone drawn pointing "up" (−y); the group's rotation aims it.
    const lx = (r * Math.sin(-half)).toFixed(2);
    const ly = (-r * Math.cos(-half)).toFixed(2);
    const rx = (r * Math.sin(half)).toFixed(2);
    const ry = (-r * Math.cos(half)).toFixed(2);
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', `M0 0 L${lx} ${ly} A${r} ${r} 0 0 1 ${rx} ${ry} Z`);
    return path;
  }

  private showPanorama(id: string): void {
    const located = findFloorPoint(id);
    if (!located) {
      this.element.hidden = true;
      this.stopLoop();
      return;
    }

    this.element.hidden = false;
    if (located.floor !== this.floor) this.renderFloor(located.floor);
    this.setCurrent(located.point);
    if (!this.collapsed) this.startLoop();
  }

  /** Fold the panel away while a video plays, restore it when the scene returns. */
  private setHiddenByVideo(hidden: boolean): void {
    if (hidden) {
      this.element.hidden = true;
      this.stopLoop();
    } else if (this.current) {
      this.element.hidden = false;
      if (!this.collapsed) this.startLoop();
    }
  }

  private renderFloor(floor: Floor): void {
    this.floor = floor;
    this.titleLabel.textContent = floor.title;
    this.svg.setAttribute('viewBox', `0 0 ${floor.viewBox.width} ${floor.viewBox.height}`);
    this.svg.replaceChildren();
    this.pointEls.clear();

    for (const room of floor.rooms) {
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('class', 'vt-minimap__room');
      rect.setAttribute('x', String(room.x));
      rect.setAttribute('y', String(room.y));
      rect.setAttribute('width', String(room.width));
      rect.setAttribute('height', String(room.height));
      rect.setAttribute('rx', '3');
      this.svg.appendChild(rect);

      if (room.label) {
        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('class', 'vt-minimap__room-label');
        text.setAttribute('x', String(room.x + 4));
        text.setAttribute('y', String(room.y + 4));
        text.textContent = room.label;
        this.svg.appendChild(text);
      }
    }

    // Cone sits above rooms but below the dots so a dot is always clickable.
    this.svg.appendChild(this.coneGroup);

    for (const point of floor.points) {
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('class', 'vt-minimap__point');
      dot.setAttribute('cx', String(point.x));
      dot.setAttribute('cy', String(point.y));
      dot.setAttribute('r', String(viewerConfig.minimap.pointRadius));
      dot.addEventListener('click', () => this.onPointClick(point.id));
      this.svg.appendChild(dot);
      this.pointEls.set(point.id, dot);
    }
  }

  private setCurrent(point: FloorPoint): void {
    for (const [id, dot] of this.pointEls) {
      const isCurrent = id === point.id;
      dot.classList.toggle('is-current', isCurrent);
      dot.setAttribute(
        'r',
        String(isCurrent ? viewerConfig.minimap.currentPointRadius : viewerConfig.minimap.pointRadius),
      );
    }
    this.current = point;
    this.northOffset = point.northOffset ?? 0;
    this.updateCone();
  }

  private onPointClick(id: string): void {
    if (id === this.current?.id) return;
    this.viewer.events.emit('link:activated', { targetId: id });
  }

  private readonly onToggle = (): void => {
    this.collapsed = !this.collapsed;
    this.element.classList.toggle('is-collapsed', this.collapsed);
    if (this.collapsed) this.stopLoop();
    else if (!this.element.hidden) this.startLoop();
  };

  private startLoop(): void {
    if (this.rafId) return;
    const frame = (): void => {
      this.updateCone();
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  private stopLoop(): void {
    if (!this.rafId) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  private updateCone(): void {
    if (!this.current) return;
    const bearing = this.northOffset + viewerConfig.minimap.yawSign * this.viewer.cameraYaw;
    this.coneGroup.setAttribute(
      'transform',
      `translate(${this.current.x} ${this.current.y}) rotate(${bearing.toFixed(1)})`,
    );
  }
}

function stopEvent(event: Event): void {
  event.stopPropagation();
}
