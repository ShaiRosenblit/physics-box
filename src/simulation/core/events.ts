import type { Id } from "./types";

export interface KernelEvents {
  add: { id: Id };
  remove: { id: Id };
  step: { tick: number };
  joint_break: { id: Id; force: number };
}

export type EventName = keyof KernelEvents;
export type Listener<E extends EventName> = (payload: KernelEvents[E]) => void;
export type Unsubscribe = () => void;

type AnyListener = (payload: unknown) => void;

export class EventBus {
  private readonly listeners = new Map<EventName, Set<AnyListener>>();

  on<E extends EventName>(event: E, listener: Listener<E>): Unsubscribe {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set<AnyListener>();
      this.listeners.set(event, set);
    }
    const wrapped = listener as AnyListener;
    set.add(wrapped);
    return () => {
      this.listeners.get(event)?.delete(wrapped);
    };
  }

  emit<E extends EventName>(event: E, payload: KernelEvents[E]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) listener(payload);
  }

  clear(): void {
    for (const set of this.listeners.values()) set.clear();
  }
}
