import type { Id, PulleySpec, Vec2 } from "../core/types";

/** Default horizontal offset from wheel center to each ground anchor (world units). */
export const PULLEY_DEFAULT_HALF_SPREAD = 0.14;

export interface PulleyInput {
  readonly wheelCenter: Vec2;
  readonly bodyA: Id;
  readonly bodyB: Id;
  readonly localAnchorA: Vec2;
  readonly localAnchorB: Vec2;
  /** Horizontal offset from wheel center to each ground anchor (default matches factory constant). */
  readonly halfSpread?: number;
  /** Block-and-tackle ratio (default 1). */
  readonly ratio?: number;
}

export function pulley(input: PulleyInput): PulleySpec {
  if (input.bodyA === input.bodyB) {
    throw new Error("pulley: bodyA and bodyB must differ");
  }
  const ratio = input.ratio ?? 1;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new Error(`pulley: ratio must be finite and > 0 (got ${ratio})`);
  }
  const spread = input.halfSpread;
  if (spread !== undefined && (!Number.isFinite(spread) || spread <= 0)) {
    throw new Error(`pulley: halfSpread must be > 0 when set (got ${spread})`);
  }
  return {
    kind: "pulley",
    wheelCenter: input.wheelCenter,
    bodyA: input.bodyA,
    bodyB: input.bodyB,
    localAnchorA: input.localAnchorA,
    localAnchorB: input.localAnchorB,
    halfSpread: input.halfSpread,
    ratio,
  };
}
