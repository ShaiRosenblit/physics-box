import type { Id, Vec2 } from "../core/types";
import type { EmConstants } from "./constants";

export interface MagneticBodyState {
  readonly id: Id;
  readonly position: Vec2;
  /** Signed magnitude; direction is `dipole × (cos(angle), sin(angle))`. */
  readonly dipole: number;
  readonly angle: number;
}

/** In-plane magnetic moment (A·m²) from signed strength and body heading. */
export function dipoleMomentXY(dipole: number, angle: number): Vec2 {
  return {
    x: dipole * Math.cos(angle),
    y: dipole * Math.sin(angle),
  };
}

/**
 * B field (Bx, By, Bz) at offset (dx, dy) from a planar dipole (mx,my,0).
 * A small ±z separation `rz` (typically ε) keeps Bz and its gradients
 * finite in the sandbox plane so Lorentz and streamlines stay well-posed.
 */
export function bFieldFromOffset(
  dx: number,
  dy: number,
  mx: number,
  my: number,
  rz: number,
  mu0Eff: number,
): { bx: number; by: number; bz: number } {
  const r2 = dx * dx + dy * dy + rz * rz;
  const r = Math.sqrt(r2);
  const r3 = r * r2;
  const k = mu0Eff / (4 * Math.PI);
  const invR = 1 / r;
  const rx = dx * invR;
  const ry = dy * invR;
  const rzHat = rz * invR;
  const mdotr = mx * rx + my * ry;
  const c = (k * 3 * mdotr) / r3;
  const invR3 = k / r3;
  return {
    bx: c * rx - mx * invR3,
    by: c * ry - my * invR3,
    bz: c * rzHat,
  };
}

/**
 * Total Bz at `p` from all magnets (point dipoles in the plane).
 */
export function sampleB(
  p: Vec2,
  magnets: readonly MagneticBodyState[],
  ec: EmConstants,
): number {
  let bz = 0;
  const rz = ec.epsilon;
  for (const m of magnets) {
    const dx = p.x - m.position.x;
    const dy = p.y - m.position.y;
    const { x: mx, y: my } = dipoleMomentXY(m.dipole, m.angle);
    bz += bFieldFromOffset(dx, dy, mx, my, rz, ec.mu0Eff).bz;
  }
  return bz;
}

/**
 * Gradient of Bz for streamline tracing and scalar force proxies.
 */
export function sampleGradB(
  p: Vec2,
  magnets: readonly MagneticBodyState[],
  ec: EmConstants,
): Vec2 {
  const rz = ec.epsilon;
  const pref = (3 * ec.mu0Eff * rz) / (4 * Math.PI);
  let gx = 0;
  let gy = 0;
  for (const m of magnets) {
    const dx = p.x - m.position.x;
    const dy = p.y - m.position.y;
    const { x: mx, y: my } = dipoleMomentXY(m.dipole, m.angle);
    const r2 = dx * dx + dy * dy + rz * rz;
    const s = mx * dx + my * dy;
    const invR7 = 1 / (r2 * r2 * Math.sqrt(r2));
    gx += pref * (mx * r2 - 5 * s * dx) * invR7;
    gy += pref * (my * r2 - 5 * s * dy) * invR7;
  }
  return { x: gx, y: gy };
}

export function magneticFieldAt(
  p: Vec2,
  magnet: MagneticBodyState,
  ec: EmConstants,
): { bx: number; by: number; bz: number } {
  const dx = p.x - magnet.position.x;
  const dy = p.y - magnet.position.y;
  const { x: mx, y: my } = dipoleMomentXY(magnet.dipole, magnet.angle);
  return bFieldFromOffset(dx, dy, mx, my, ec.epsilon, ec.mu0Eff);
}
