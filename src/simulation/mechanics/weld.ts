import type { Id, Vec2, WeldSpec } from "../core/types";

export interface WeldInput {
  bodyA: Id;
  bodyB: Id;
  worldAnchor: Vec2;
}

export function weld(input: WeldInput): WeldSpec {
  return {
    kind: "weld",
    bodyA: input.bodyA,
    bodyB: input.bodyB,
    worldAnchor: input.worldAnchor,
  };
}
