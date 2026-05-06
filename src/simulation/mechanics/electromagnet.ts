import type {
  ElectromagnetSpec,
  Id,
  MaterialName,
  Vec2,
} from "../core/types";

export interface ElectromagnetInput {
  position: Vec2;
  radius: number;
  dipole: number;
  angle?: number;
  material?: MaterialName;
  fixed?: boolean;
  defaultEnabled?: boolean;
  triggerBy?: Id;
  velocity?: Vec2;
  angularVelocity?: number;
  fixtureRestitution?: number;
  fixtureFriction?: number;
  linearDamping?: number;
  angularDamping?: number;
}

/**
 * Toggleable magnet. Authored `dipole` and `angle` follow the same
 * conventions as `magnet`. Field/forces are gated by the effective
 * `enabled` state.
 */
export function electromagnet(input: ElectromagnetInput): ElectromagnetSpec {
  if (input.radius <= 0) {
    throw new Error(`electromagnet: radius must be > 0 (got ${input.radius})`);
  }
  if (!Number.isFinite(input.dipole)) {
    throw new Error(`electromagnet: dipole must be a finite number`);
  }
  return {
    kind: "electromagnet",
    position: input.position,
    radius: input.radius,
    dipole: input.dipole,
    angle: input.angle ?? 0,
    velocity: input.velocity,
    angularVelocity: input.angularVelocity,
    fixed: input.fixed ?? true,
    material: input.material ?? "metal",
    defaultEnabled: input.defaultEnabled ?? true,
    ...(input.triggerBy !== undefined ? { triggerBy: input.triggerBy } : {}),
    ...(input.fixtureRestitution !== undefined
      ? { fixtureRestitution: input.fixtureRestitution }
      : {}),
    ...(input.fixtureFriction !== undefined
      ? { fixtureFriction: input.fixtureFriction }
      : {}),
    ...(input.linearDamping !== undefined
      ? { linearDamping: input.linearDamping }
      : {}),
    ...(input.angularDamping !== undefined
      ? { angularDamping: input.angularDamping }
      : {}),
  };
}
