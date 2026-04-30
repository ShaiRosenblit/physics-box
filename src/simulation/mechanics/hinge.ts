import type { HingeSpec, Id, Vec2 } from "../core/types";

export interface HingeInput {
  bodyA: Id;
  bodyB?: Id;
  worldAnchor: Vec2;
}

export function hinge(input: HingeInput): HingeSpec {
  return {
    kind: "hinge",
    bodyA: input.bodyA,
    bodyB: input.bodyB,
    worldAnchor: input.worldAnchor,
  };
}
