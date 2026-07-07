export type EventHandler<TPayload> = (payload: TPayload) => void;

/**
 * Minimal strongly-typed publish/subscribe bus.
 *
 * Modules communicate through events rather than direct references, which keeps
 * the dependency graph acyclic (e.g. UI listens to the Viewer without the
 * Viewer ever importing the UI). `Events` maps an event name to its payload
 * type, so `on`/`emit` are fully type-checked.
 */
export class EventBus<Events extends Record<string, unknown>> {
  private readonly handlers = new Map<keyof Events, Set<EventHandler<never>>>();

  /** Subscribe. Returns an unsubscribe function for easy cleanup. */
  public on<K extends keyof Events>(type: K, handler: EventHandler<Events[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler as EventHandler<never>);
    return () => this.off(type, handler);
  }

  public off<K extends keyof Events>(type: K, handler: EventHandler<Events[K]>): void {
    this.handlers.get(type)?.delete(handler as EventHandler<never>);
  }

  public emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const set = this.handlers.get(type);
    if (!set) return;
    // Iterate a copy so handlers may unsubscribe themselves during dispatch.
    for (const handler of [...set]) {
      (handler as EventHandler<Events[K]>)(payload);
    }
  }

  public clear(): void {
    this.handlers.clear();
  }
}
