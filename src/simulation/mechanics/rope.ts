import type { Anchor, MaterialName, RopeSpec } from "../core/types";

export interface RopeInput {
  a: Anchor;
  b: Anchor;
  length: number;
  segments?: number;
  material?: MaterialName;
}

export function rope(input: RopeInput): RopeSpec {
  if (input.length <= 0) {
    throw new Error(`rope: length must be > 0 (got ${input.length})`);
  }
  if (
    input.segments !== undefined &&
    input.segments !== 0 &&
    input.segments < 2
  ) {
    throw new Error(
      `rope: segments must be 0 (rigid link) or >= 2 (got ${input.segments})`,
    );
  }
  return {
    kind: "rope",
    a: input.a,
    b: input.b,
    length: input.length,
    segments: input.segments,
    material: input.material ?? "wood",
  };
}
