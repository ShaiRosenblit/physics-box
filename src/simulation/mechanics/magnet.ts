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
  fixtureFriction?: number;
  linearDamping?: number;
  angularDamping?: number;
}

/**
 * Factory for a magnet body. `dipole` is a signed magnitude; the moment
 * points along the body’s local +x axis: **m** = dipole × (cos θ, sin θ)
 * with θ = `angle` / Planck rotation. Contacts behave like a metal disc.
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
    ...(input.fixtureFriction !== undefined ? { fixtureFriction: input.fixtureFriction } : {}),
    ...(input.linearDamping !== undefined ? { linearDamping: input.linearDamping } : {}),
    ...(input.angularDamping !== undefined ? { angularDamping: input.angularDamping } : {}),
  };
}
