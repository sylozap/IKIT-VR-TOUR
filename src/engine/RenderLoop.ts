export type TickCallback = (deltaSeconds: number) => void;

/**
 * A bare `requestAnimationFrame` driver. It knows nothing about scenes, cameras
 * or panoramas — it only converts the rAF clock into a clamped per-frame delta
 * and calls back. This is what lets every animated subsystem stay
 * frame-rate independent.
 */
export class RenderLoop {
  private readonly onTick: TickCallback;
  private rafId = 0;
  private running = false;
  private lastTime = 0;

  /** Guards against the huge dt produced after the tab was backgrounded. */
  private static readonly MAX_DELTA = 1 / 15;

  constructor(onTick: TickCallback) {
    this.onTick = onTick;
  }

  public get isRunning(): boolean {
    return this.running;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private readonly loop = (time: number): void => {
    if (!this.running) return;
    const deltaSeconds = Math.min((time - this.lastTime) / 1000, RenderLoop.MAX_DELTA);
    this.lastTime = time;
    this.onTick(deltaSeconds);
    this.rafId = requestAnimationFrame(this.loop);
  };
}
