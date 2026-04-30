import type { Id, Vec2 } from "../core/types";
import type { EmConstants } from "./constants";

export interface MagneticBodyState {
  readonly id: Id;
  readonly position: Vec2;
  readonly dipole: number;
}

/**
 * Sandbox magnetism uses a SCALAR B field treatment to keep Lorentz
 * force tractable in 2D. Each magnet body is treated as a signed
 * point-source whose contribution to B is:
 *
 *   B_i(p) = (μ₀_eff / 2π) * m_i / (|p - p_i|² + ε²)
 *
 * B is read as the out-of-plane component (B_z). This is a sandbox
 * simplification, not a real magnetic dipole; documented in
 * PHYSICS_GUIDELINES.md.
 */
export function sampleB(
  p: Vec2,
  magnets: readonly MagneticBodyState[],
  ec: EmConstants,
): number {
  const eps2 = ec.epsilon * ec.epsilon;
  const k = ec.mu0Eff / (2 * Math.PI);
  let b = 0;
  for (const m of magnets) {
    const dx = p.x - m.position.x;
    const dy = p.y - m.position.y;
    const r2 = dx * dx + dy * dy + eps2;
    b += (k * m.dipole) / r2;
  }
  return b;
}

/**
 * Gradient of the scalar B field at p. Used by the dipole-on-dipole
 * solver and by the streamline tracer (after a 90° rotation).
 */
export function sampleGradB(
  p: Vec2,
  magnets: readonly MagneticBodyState[],
  ec: EmConstants,
): Vec2 {
  const eps2 = ec.epsilon * ec.epsilon;
  const k = ec.mu0Eff / (2 * Math.PI);
  let gx = 0;
  let gy = 0;
  for (const m of magnets) {
    const dx = p.x - m.position.x;
    const dy = p.y - m.position.y;
    const r2 = dx * dx + dy * dy + eps2;
    const f = (-2 * k * m.dipole) / (r2 * r2);
    gx += f * dx;
    gy += f * dy;
  }
  return { x: gx, y: gy };
}
