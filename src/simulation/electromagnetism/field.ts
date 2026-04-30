import type { Vec2 } from "../core/types";
import type { EmConstants } from "./constants";
import type { ChargedBodyState } from "./coulomb";

/**
 * Electric field at a point due to a set of point charges with
 * softening:
 *
 *   E(p) = sum_i  k_e * q_i * (p - p_i) / (|r|² + ε²)^(3/2)
 *
 * Returns a 2D vector (V/m in sandbox units).
 */
export function sampleE(
  p: Vec2,
  charges: readonly ChargedBodyState[],
  ec: EmConstants,
): Vec2 {
  let ex = 0;
  let ey = 0;
  const eps2 = ec.epsilon * ec.epsilon;
  for (const c of charges) {
    const dx = p.x - c.position.x;
    const dy = p.y - c.position.y;
    const r2 = dx * dx + dy * dy + eps2;
    const r = Math.sqrt(r2);
    const k = (ec.kE * c.charge) / (r2 * r);
    ex += k * dx;
    ey += k * dy;
  }
  return { x: ex, y: ey };
}
