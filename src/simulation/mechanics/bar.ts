import type { Anchor, BarSpec } from "../core/types";

export interface BarInput {
  a: Anchor;
  b: Anchor;
  length: number;
}

export function bar(input: BarInput): BarSpec {
  if (input.length <= 0) {
    throw new Error(`bar: length must be > 0 (got ${input.length})`);
  }
  return {
    kind: "bar",
    a: input.a,
    b: input.b,
    length: input.length,
  };
}
