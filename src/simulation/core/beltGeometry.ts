import type { BodySpec, BodyView, Vec2 } from "./types";

/** Effective sheave radius for belt path and default gear ratio. */
export function effectivePulleyRadiusFromSpec(spec: BodySpec): number {
  if (
    spec.kind === "ball" ||
    spec.kind === "balloon" ||
    spec.kind === "magnet" ||
    spec.kind === "engine_rotor"
  ) {
    return spec.radius;
  }
  if (spec.kind === "engine") {
    return Math.min(spec.width, spec.height) / 2;
  }
  return Math.min(spec.width, spec.height) / 2;
}

export function effectivePulleyRadiusFromView(view: BodyView): number {
  if (
    view.kind === "ball" ||
    view.kind === "balloon" ||
    view.kind === "magnet" ||
    view.kind === "engine_rotor"
  ) {
    return view.radius;
  }
  if (view.kind === "engine") {
    return Math.min(view.width, view.height) / 2;
  }
  return Math.min(view.width, view.height) / 2;
}

export interface BeltTangents {
  readonly ua1: Vec2;
  readonly ua2: Vec2;
  readonly la1: Vec2;
  readonly la2: Vec2;
}

/**
 * Outer common tangents for an open belt between two circles in the plane.
 * Returns null only when centers coincide (degenerate).
 */
export function computeOpenBeltTangents(
  c1: Vec2,
  r1: number,
  c2: Vec2,
  r2: number,
): BeltTangents | null {
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-9) return null;
  const vx = dx / d;
  const vy = dy / d;
  const px = -vy;
  const py = vx;
  const dr = r1 - r2;
  const w2 = d * d - dr * dr;
  if (w2 < 0) {
    const ux = dx / d;
    const uy = dy / d;
    return {
      ua1: { x: c1.x + ux * r1, y: c1.y + uy * r1 },
      ua2: { x: c2.x - ux * r2, y: c2.y - uy * r2 },
      la1: { x: c1.x + ux * r1, y: c1.y + uy * r1 },
      la2: { x: c2.x - ux * r2, y: c2.y - uy * r2 },
    };
  }
  const h = Math.sqrt(w2);
  const nxu = (dr * vx + h * px) / d;
  const nyu = (dr * vy + h * py) / d;
  const nxl = (dr * vx - h * px) / d;
  const nyl = (dr * vy - h * py) / d;
  return {
    ua1: { x: c1.x + r1 * nxu, y: c1.y + r1 * nyu },
    ua2: { x: c2.x + r2 * nxu, y: c2.y + r2 * nyu },
    la1: { x: c1.x + r1 * nxl, y: c1.y + r1 * nyl },
    la2: { x: c2.x + r2 * nxl, y: c2.y + r2 * nyl },
  };
}

/** Closed polyline for hit-testing and rendering (two straight runs of an open belt). */
export function beltDisplayPath(c1: Vec2, r1: number, c2: Vec2, r2: number): Vec2[] {
  const t = computeOpenBeltTangents(c1, r1, c2, r2);
  if (!t) return [c1, c2];
  return [t.ua1, t.ua2, t.la2, t.la1];
}
