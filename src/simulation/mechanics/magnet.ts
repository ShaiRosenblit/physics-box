import type { MagnetSpec, MaterialName, Vec2 } from "../core/types";

export interface MagnetInput {
  position: Vec2;
  radius: number;
  dipole: number;
  material?: MaterialName;
  velocity?: Vec2;
  angularVelocity?: number;
  angle?: number;
  fixed?: boolean;
  fixtureRestitution?: number;
  linearDamping?: number;
  angularDamping?: number;
}

/**
 * Factory for a magnet body. The dipole moment is signed; positive
 * dipoles project a "north" pole at the body's center, negative ones
 * a "south". Geometry is a small disc, mass and contacts behave like
 * a metal ball.
 */
export function magnet(input: MagnetInput): MagnetSpec {
  if (input.radius <= 0) {
    throw new Error(`magnet: radius must be > 0 (got ${input.radius})`);
  }
  if (!Number.isFinite(input.dipole)) {
    throw new Error(`magnet: dipole must be a finite number`);
  }
  return {
    kind: "magnet",
    position: input.position,
    radius: input.radius,
    dipole: input.dipole,
    angle: input.angle ?? 0,
    velocity: input.velocity,
    angularVelocity: input.angularVelocity,
    fixed: input.fixed ?? false,
    material: input.material ?? "metal",
    ...(input.fixtureRestitution !== undefined
      ? { fixtureRestitution: input.fixtureRestitution }
      : {}),
    ...(input.linearDamping !== undefined ? { linearDamping: input.linearDamping } : {}),
    ...(input.angularDamping !== undefined ? { angularDamping: input.angularDamping } : {}),
  };
}
