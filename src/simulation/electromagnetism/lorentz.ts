import type { Id, Vec2 } from "../core/types";
import type { EmConstants } from "./constants";
import type { ChargedBodyState } from "./coulomb";
import { bFieldFromOffset, dipoleMomentXY, sampleB, type MagneticBodyState } from "./magnetism";

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

/** Force on dipole B at the tip of r (r = pos_B − pos_A) from dipole A. */
function dipoleDipoleForceOnB(
  mA: Vec2,
  mB: Vec2,
  rx: number,
  ry: number,
  r2Soft: number,
  mu0Eff: number,
): Vec2 {
  const invR2 = 1 / r2Soft;
  const invREff = 1 / Math.sqrt(r2Soft);
  const invR5 = invR2 * invR2 * invREff;
  const k = ((3 * mu0Eff) / (4 * Math.PI)) * invR5;
  const mAdr = mA.x * rx + mA.y * ry;
  const mBdr = mB.x * rx + mB.y * ry;
  const dotAB = mA.x * mB.x + mA.y * mB.y;
  const align = 5 * mAdr * mBdr * invR2;
  const fx = mAdr * mB.x + mBdr * mA.x + dotAB * rx - align * rx;
  const fy = mAdr * mB.y + mBdr * mA.y + dotAB * ry - align * ry;
  return { x: k * fx, y: k * fy };
}

/**
 * Pairwise interaction of planar magnetic dipoles (same ε softening on
 * separation as elsewhere). Newton’s third law holds for the translational
 * part. Magnitudes are clamped to maxEmForce per magnet after summing pairs.
 */
export function computeMagnetPairForces(
  magnets: readonly MagneticBodyState[],
  ec: EmConstants,
): Map<Id, Vec2> {
  const out = new Map<Id, Vec2>();
  const eps2 = ec.epsilon * ec.epsilon;
  for (let i = 0; i < magnets.length; i++) {
    const a = magnets[i];
    const mA = dipoleMomentXY(a.dipole, a.angle);
    for (let j = i + 1; j < magnets.length; j++) {
      const b = magnets[j];
      const mB = dipoleMomentXY(b.dipole, b.angle);
      const rx = b.position.x - a.position.x;
      const ry = b.position.y - a.position.y;
      const r2 = rx * rx + ry * ry + eps2;
      const fab = dipoleDipoleForceOnB(mA, mB, rx, ry, r2, ec.mu0Eff);
      addForce(out, b.id, fab.x, fab.y);
      addForce(out, a.id, -fab.x, -fab.y);
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

/**
 * Scalar torque (z) on each magnet: τ = Σ (m × B_other) · ẑ with B from
 * superposed dipoles excluding self. Clamped per body to maxEmTorque.
 */
export function computeMagnetPairTorques(
  magnets: readonly MagneticBodyState[],
  ec: EmConstants,
): Map<Id, number> {
  const out = new Map<Id, number>();
  const n = magnets.length;
  for (let j = 0; j < n; j++) {
    const tgt = magnets[j];
    const mj = dipoleMomentXY(tgt.dipole, tgt.angle);
    let tau = 0;
    for (let i = 0; i < n; i++) {
      if (i === j) continue;
      const src = magnets[i];
      const dx = tgt.position.x - src.position.x;
      const dy = tgt.position.y - src.position.y;
      const mi = dipoleMomentXY(src.dipole, src.angle);
      const { bx, by } = bFieldFromOffset(dx, dy, mi.x, mi.y, ec.epsilon, ec.mu0Eff);
      tau += mj.x * by - mj.y * bx;
    }
    if (tau === 0) continue;
    let t = tau;
    const lim = ec.maxEmTorque;
    if (Math.abs(t) > lim) t = Math.sign(t) * lim;
    out.set(tgt.id, t);
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
