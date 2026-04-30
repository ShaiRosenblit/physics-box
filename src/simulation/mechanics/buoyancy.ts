import type { SimulationConfig } from "../core/config";
import type { Id, Vec2 } from "../core/types";

export interface BuoyantBodyState {
  readonly id: Id;
  readonly velocity: Vec2;
  readonly displacedArea: number;
  readonly buoyancyScale: number;
  readonly buoyancyLift: number;
}

/**
 * Archimedes-style force F = ρ_fluid × A × (−g) plus optional prescriptive lift
 * along “up” (−ĝ) and linear drag F = −k v. Per-body force clamped to `maxBuoyancyForce`.
 */
export function computeBuoyancyForces(
  bodies: readonly BuoyantBodyState[],
  gravity: Vec2,
  cfg: SimulationConfig,
): Map<Id, Vec2> {
  const out = new Map<Id, Vec2>();
  const gMag = Math.hypot(gravity.x, gravity.y);
  const up =
    gMag > 1e-9
      ? { x: -gravity.x / gMag, y: -gravity.y / gMag }
      : ({ x: 0, y: 1 } as const);

  for (const b of bodies) {
    const scale = b.buoyancyScale;
    let fx = 0;
    let fy = 0;

    if (cfg.fluidDensity > 0 && scale > 0) {
      const c = -cfg.fluidDensity * b.displacedArea * scale;
      fx += c * gravity.x;
      fy += c * gravity.y;
    }

    if (b.buoyancyLift > 0 && scale > 0) {
      fx += up.x * b.buoyancyLift * scale;
      fy += up.y * b.buoyancyLift * scale;
    }

    if (cfg.fluidLinearDrag > 0) {
      fx -= cfg.fluidLinearDrag * b.velocity.x;
      fy -= cfg.fluidLinearDrag * b.velocity.y;
    }

    const mag = Math.hypot(fx, fy);
    if (mag > cfg.maxBuoyancyForce) {
      const s = cfg.maxBuoyancyForce / mag;
      fx *= s;
      fy *= s;
    }

    if (fx !== 0 || fy !== 0) {
      out.set(b.id, { x: fx, y: fy });
    }
  }

  return out;
}
