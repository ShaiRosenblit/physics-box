import type { Id, Vec2 } from "../core/types";
import type { EmConstants } from "./constants";

export interface ChargedBodyState {
  readonly id: Id;
  readonly position: Vec2;
  readonly charge: number;
}

/**
 * Pairwise Coulomb force in 2D with softening:
 *
 *   F_on_a = -k_e * q_a * q_b * (b - a) / (|r|² + ε²)^(3/2)
 *
 * Sign convention: like charges repel (force on a points away from b),
 * opposite charges attract.
 *
 * Iteration is stable in id order (caller passes states sorted by id)
 * which keeps determinism intact.
 *
 * Per-body magnitude is clamped to `cap` to avoid catastrophic spikes
 * during near-encounters even with softening.
 */
export function computeCoulombForces(
  states: readonly ChargedBodyState[],
  ec: EmConstants,
): Map<Id, Vec2> {
  const forces = new Map<Id, Vec2>();
  const eps2 = ec.epsilon * ec.epsilon;

  for (let i = 0; i < states.length; i++) {
    const a = states[i];
    for (let j = i + 1; j < states.length; j++) {
      const b = states[j];
      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const r2 = dx * dx + dy * dy + eps2;
      const r = Math.sqrt(r2);
      const k = (ec.kE * a.charge * b.charge) / (r2 * r);
      const fx = -k * dx;
      const fy = -k * dy;
      addForce(forces, a.id, fx, fy);
      addForce(forces, b.id, -fx, -fy);
    }
  }

  for (const [id, f] of forces) {
    const m = Math.hypot(f.x, f.y);
    if (m > ec.maxEmForce) {
      const s = ec.maxEmForce / m;
      forces.set(id, { x: f.x * s, y: f.y * s });
    }
  }

  return forces;
}

function addForce(
  forces: Map<Id, Vec2>,
  id: Id,
  fx: number,
  fy: number,
): void {
  const existing = forces.get(id);
  if (!existing) {
    forces.set(id, { x: fx, y: fy });
  } else {
    forces.set(id, { x: existing.x + fx, y: existing.y + fy });
  }
}
