import type { PanoramaNode } from '@/core/types';
import { panoramas as defaultNodes } from '@/config/panoramas';

/**
 * The data-access seam for the tour graph. Everything reads nodes through this
 * repository, never from the config array directly, so the source can later
 * become an async CMS/API client without rippling through the app — only the
 * constructor's input changes.
 */
export class PanoramaRepository {
  private readonly nodes: Map<string, PanoramaNode>;

  constructor(nodes: PanoramaNode[] = defaultNodes) {
    this.nodes = new Map(nodes.map((node) => [node.id, node]));
  }

  public get(id: string): PanoramaNode | undefined {
    return this.nodes.get(id);
  }

  public getOrThrow(id: string): PanoramaNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Unknown panorama id: "${id}"`);
    return node;
  }

  public has(id: string): boolean {
    return this.nodes.has(id);
  }

  public all(): PanoramaNode[] {
    return [...this.nodes.values()];
  }

  public get size(): number {
    return this.nodes.size;
  }
}
