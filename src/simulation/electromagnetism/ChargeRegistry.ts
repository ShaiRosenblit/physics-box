import type { Id } from "../core/types";

/**
 * Tracks which bodies carry non-zero charge. Stores only ids — current
 * positions and exact charges are read from the adapter at solver time
 * so the registry never duplicates physics state.
 */
export class ChargeRegistry {
  private readonly ids = new Set<Id>();

  register(id: Id, charge: number): void {
    if (charge === 0 || !Number.isFinite(charge)) {
      this.ids.delete(id);
      return;
    }
    this.ids.add(id);
  }

  unregister(id: Id): void {
    this.ids.delete(id);
  }

  has(id: Id): boolean {
    return this.ids.has(id);
  }

  size(): number {
    return this.ids.size;
  }

  list(): Iterable<Id> {
    return this.ids;
  }

  clear(): void {
    this.ids.clear();
  }
}
