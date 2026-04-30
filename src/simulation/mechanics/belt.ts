import type { BeltSpec, Id } from "../core/types";

export interface BeltInput {
  readonly driverRotorId: Id;
  readonly drivenBodyId: Id;
  /**
   * Planck `GearJoint` ratio (coordinate1 + ratio × coordinate2 = const).
   * Omit for −r_driven/r_driver so the driven body spins the same way as
   * the flywheel when the housing is fixed.
   */
  readonly ratio?: number;
}

export function belt(input: BeltInput): BeltSpec {
  if (input.driverRotorId === input.drivenBodyId) {
    throw new Error("belt: driver and driven bodies must differ");
  }
  if (
    input.ratio !== undefined &&
    (!Number.isFinite(input.ratio) || Math.abs(input.ratio) < 1e-9)
  ) {
    throw new Error(`belt: ratio must be finite and non-zero (got ${input.ratio})`);
  }
  return {
    kind: "belt",
    driverRotorId: input.driverRotorId,
    drivenBodyId: input.drivenBodyId,
    ...(input.ratio !== undefined ? { ratio: input.ratio } : {}),
  };
}
