import type { Anchor, SpringSpec } from "../core/types";

export interface SpringInput {
  a: Anchor;
  b: Anchor;
  restLength?: number;
  frequencyHz?: number;
  dampingRatio?: number;
  breakForce?: number;
}

export function spring(input: SpringInput): SpringSpec {
  if (input.frequencyHz !== undefined && input.frequencyHz < 0) {
    throw new Error(
      `spring: frequencyHz must be >= 0 (got ${input.frequencyHz})`,
    );
  }
  if (input.dampingRatio !== undefined && input.dampingRatio < 0) {
    throw new Error(
      `spring: dampingRatio must be >= 0 (got ${input.dampingRatio})`,
    );
  }
  return {
    kind: "spring",
    a: input.a,
    b: input.b,
    restLength: input.restLength,
    frequencyHz: input.frequencyHz ?? 4,
    dampingRatio: input.dampingRatio ?? 0.5,
    ...(input.breakForce !== undefined && input.breakForce > 0
      ? { breakForce: input.breakForce }
      : {}),
  };
}
