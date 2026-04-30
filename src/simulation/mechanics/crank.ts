import type { CrankSpec, MaterialName, Vec2 } from "../core/types";

export interface CrankInput {
  position: Vec2;
  radius: number;
  /**
   * Pin position in body-local coordinates (m). When omitted, uses
   * `pinRadius` or defaults to ~65% of `radius` along local +x.
   */
  pinLocal?: Vec2;
  /** Shorthand: distance along local +x to the pin; ignored if `pinLocal` is set. */
  pinRadius?: number;
  charge?: number;
  material?: MaterialName;
  velocity?: Vec2;
  angularVelocity?: number;
  angle?: number;
  fixed?: boolean;
  collideWithBalls?: boolean;
  fixtureRestitution?: number;
  fixtureFriction?: number;
  linearDamping?: number;
  angularDamping?: number;
}

export function crank(input: CrankInput): CrankSpec {
  if (input.radius <= 0) {
    throw new Error(`crank: radius must be > 0 (got ${input.radius})`);
  }
  const r = input.radius;
  let pinLocal: Vec2;
  if (input.pinLocal !== undefined) {
    pinLocal = { x: input.pinLocal.x, y: input.pinLocal.y };
  } else {
    const alongX = input.pinRadius ?? r * 0.65;
    pinLocal = { x: alongX, y: 0 };
  }
  const spec: CrankSpec = {
    kind: "crank",
    position: input.position,
    radius: r,
    pinLocal,
    angle: input.angle ?? 0,
    velocity: input.velocity,
    angularVelocity: input.angularVelocity,
    fixed: input.fixed ?? false,
    material: input.material ?? "metal",
    charge: input.charge,
  };
  return {
    ...spec,
    ...(input.collideWithBalls === false ? { collideWithBalls: false as const } : {}),
    ...(input.fixtureRestitution !== undefined
      ? { fixtureRestitution: input.fixtureRestitution }
      : {}),
    ...(input.fixtureFriction !== undefined ? { fixtureFriction: input.fixtureFriction } : {}),
    ...(input.linearDamping !== undefined ? { linearDamping: input.linearDamping } : {}),
    ...(input.angularDamping !== undefined ? { angularDamping: input.angularDamping } : {}),
  };
}
