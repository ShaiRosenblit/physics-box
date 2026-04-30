import type { Id, Vec2 } from "../core/types";
import type { EmConstants } from "./constants";
import type { ChargedBodyState } from "./coulomb";
import { sampleB, type MagneticBodyState } from "./magnetism";

/**
 * Per-body Lorentz force on charged bodies, given a scalar B field
 * sampled at each body's position. Sign convention:
 *
 *   F = q * B * ( v_y, -v_x )
 *
 * which is the standard `q (v × B_z ẑ)` reduction for in-plane v.
 *
 * The result is clamped to maxEmForce per body. Solver runs once per
 * substep; B is sampled from current magnet positions, so determinism
 * is preserved if the inputs are passed in stable id order.
 */
export function computeLorentzForces(
  charges: readonly (ChargedBodyState & { velocity: Vec2 })[],
  magnets: readonly MagneticBodyState[],
  ec: EmConstants,
): Map<Id, Vec2> {
  const out = new Map<Id, Vec2>();
  if (magnets.length === 0) return out;
  for (const c of charges) {
    if (c.charge === 0) continue;
    const b = sampleB(c.position, magnets, ec);
    if (b === 0) continue;
    let fx = c.charge * b * c.velocity.y;
    let fy = -c.charge * b * c.velocity.x;
    const mag = Math.hypot(fx, fy);
    if (mag > ec.maxEmForce) {
      const s = ec.maxEmForce / mag;
      fx *= s;
      fy *= s;
    }
    out.set(c.id, { x: fx, y: fy });
  }
  return out;
}

/**
 * Pairwise force on each magnet from every other magnet's B field,
 * using a scalar-monopole convention so like-sign dipoles repel and
 * opposite-sign attract:
 *
 *   F_a = m_a * m_b * (μ₀_eff / π) * (p_a - p_b) / (|r|² + ε²)²
 *
 * Returned as a force per magnet id. Magnitudes are clamped to
 * maxEmForce. Note this is not a true dipole-on-dipole formula; see
 * PHYSICS_GUIDELINES.md for the rationale.
 */
export function computeMagnetPairForces(
  magnets: readonly MagneticBodyState[],
  ec: EmConstants,
): Map<Id, Vec2> {
  const out = new Map<Id, Vec2>();
  const eps2 = ec.epsilon * ec.epsilon;
  const k = ec.mu0Eff / Math.PI;
  for (let i = 0; i < magnets.length; i++) {
    const a = magnets[i];
    for (let j = i + 1; j < magnets.length; j++) {
      const b = magnets[j];
      const dx = a.position.x - b.position.x;
      const dy = a.position.y - b.position.y;
      const r2 = dx * dx + dy * dy + eps2;
      const f = (k * a.dipole * b.dipole) / (r2 * r2);
      addForce(out, a.id, f * dx, f * dy);
      addForce(out, b.id, -f * dx, -f * dy);
    }
  }
  for (const [id, v] of out) {
    const m = Math.hypot(v.x, v.y);
    if (m > ec.maxEmForce) {
      const s = ec.maxEmForce / m;
      out.set(id, { x: v.x * s, y: v.y * s });
    }
  }
  return out;
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
