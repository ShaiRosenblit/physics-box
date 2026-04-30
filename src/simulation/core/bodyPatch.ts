import type { SimulationConfig } from "./config";
import type { BallSpec, BodyPatch, BodySpec } from "./types";

export const MIN_BODY_RADIUS = 0.05;
export const MIN_BOX_EXTENT = 0.05;

/** Symmetric clamp to `±cap` (matches charge / dipole semantics in `World`). */
export function clampToSymmetricCap(value: number, cap: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value > cap) return cap;
  if (value < -cap) return -cap;
  return value;
}

/** Enforce simulator limits from config (charge, dipole). */
export function clampBodySpecToConfig(spec: BodySpec, cfg: SimulationConfig): BodySpec {
  const qRaw = spec.charge ?? 0;
  const q = clampToSymmetricCap(qRaw, cfg.maxCharge);
  let next: BodySpec = qRaw === q ? spec : { ...spec, charge: q };

  if (next.kind === "magnet") {
    const m = next as Extract<BodySpec, { kind: "magnet" }>;
    const d = clampToSymmetricCap(m.dipole, cfg.maxDipole);
    if (d !== m.dipole) next = { ...m, dipole: d };
  }
  return sanitizeBodyGeometry(next);
}

/** Clamp geometry to positive minimums suitable for stable fixtures. */
export function sanitizeBodyGeometry(spec: BodySpec): BodySpec {
  if (spec.kind === "ball") {
    const r = Math.max(MIN_BODY_RADIUS, spec.radius);
    return r === spec.radius ? spec : { ...spec, radius: r };
  }
  if (spec.kind === "magnet") {
    const r = Math.max(MIN_BODY_RADIUS, spec.radius);
    return r === spec.radius ? spec : { ...spec, radius: r };
  }
  const w = Math.max(MIN_BOX_EXTENT, spec.width);
  const h = Math.max(MIN_BOX_EXTENT, spec.height);
  if (w === spec.width && h === spec.height) return spec;
  return { ...spec, width: w, height: h };
}

/**
 * Apply a sparse patch onto an existing spec. Unsupported keys for this body
 * kind are ignored. Does not clamp — callers run `clampBodySpecToConfig` after.
 */
export function mergeBodyPatch(spec: BodySpec, patch: BodyPatch): BodySpec {
  let n: BodySpec = { ...spec };
  const p = patch;

  if (p.position !== undefined) {
    n = { ...n, position: { x: p.position.x, y: p.position.y } };
  }
  if (p.angle !== undefined) n = { ...n, angle: p.angle };
  if (p.charge !== undefined) {
    const base = { ...n, charge: p.charge } as BodySpec;
    n = base;
  }
  if (p.material !== undefined) n = { ...n, material: p.material };
  if (p.fixed !== undefined) n = { ...n, fixed: p.fixed };
  if (p.linearDamping !== undefined) {
    const base = { ...n, linearDamping: p.linearDamping };
    n = base as BodySpec;
  }
  if (p.angularDamping !== undefined) {
    const base = { ...n, angularDamping: p.angularDamping };
    n = base as BodySpec;
  }
  if (p.fixtureFriction !== undefined) {
    const base = { ...n, fixtureFriction: p.fixtureFriction };
    n = base as BodySpec;
  }
  if (p.fixtureRestitution !== undefined) {
    const base = { ...n, fixtureRestitution: p.fixtureRestitution };
    n = base as BodySpec;
  }

  if (n.kind === "ball") {
    let b: BallSpec = { ...(n as BallSpec) };
    if (p.radius !== undefined) b = { ...b, radius: p.radius };
    if (p.collideWithBalls !== undefined) {
      if (p.collideWithBalls) {
        const { collideWithBalls: _omit, ...rest } = b;
        b = rest as BallSpec;
      } else {
        b = { ...b, collideWithBalls: false };
      }
    }
    n = b;
  } else if (n.kind === "box") {
    let b = n;
    if (p.width !== undefined) b = { ...b, width: p.width };
    if (p.height !== undefined) b = { ...b, height: p.height };
    n = b;
  } else {
    let m = n;
    if (p.radius !== undefined) m = { ...m, radius: p.radius };
    if (p.dipole !== undefined) m = { ...m, dipole: p.dipole };
    n = m;
  }

  return n;
}
