import type { MaterialName, SwitchSpec, Vec2 } from "../core/types";

export interface SwitchInput {
  position: Vec2;
  width: number;
  height: number;
  angle?: number;
  material?: MaterialName;
  fixtureRestitution?: number;
  fixtureFriction?: number;
}

/**
 * Pressure plate factory. Always static. Snapshot exposes `pressed` —
 * `true` whenever any dynamic body is touching the plate.
 */
export function pressureSwitch(input: SwitchInput): SwitchSpec {
  if (input.width <= 0 || input.height <= 0) {
    throw new Error(
      `switch: width and height must be > 0 (got ${input.width}, ${input.height})`,
    );
  }
  return {
    kind: "switch",
    position: input.position,
    width: input.width,
    height: input.height,
    angle: input.angle ?? 0,
    fixed: true,
    material: input.material ?? "metal",
    ...(input.fixtureRestitution !== undefined
      ? { fixtureRestitution: input.fixtureRestitution }
      : {}),
    ...(input.fixtureFriction !== undefined
      ? { fixtureFriction: input.fixtureFriction }
      : {}),
  };
}
