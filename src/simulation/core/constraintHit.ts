import type { ConstraintView, Id, Vec2 } from "./types";

function distPointSegmentSq(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-14) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + abx * t;
  const qy = ay + aby * t;
  const dx = px - qx;
  const dy = py - qy;
  return dx * dx + dy * dy;
}

/** Polyline tracing the procedural spring coils (aligned with ConstraintView renderer). */
function springHitPolyline(ax: number, ay: number, bx: number, by: number, restLength: number): Vec2[] {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return [{ x: ax, y: ay }, { x: bx, y: by }];
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const coils = 10;
  const amp = Math.min(0.12, restLength * 0.12);
  const inset = 0.08;
  const out: Vec2[] = [];
  out.push({ x: ax, y: ay });
  out.push({ x: ax + ux * inset, y: ay + uy * inset });
  for (let i = 1; i <= coils; i++) {
    const t = (i - 0.5) / coils;
    const cx = ax + ux * (inset + t * (len - 2 * inset));
    const cy = ay + uy * (inset + t * (len - 2 * inset));
    const sign = i % 2 === 0 ? 1 : -1;
    out.push({ x: cx + nx * amp * sign, y: cy + ny * amp * sign });
  }
  out.push({ x: bx - ux * inset, y: by - uy * inset });
  out.push({ x: bx, y: by });
  return out;
}

function minDistAlongPolyline(p: Vec2, pts: readonly Vec2[]): number {
  if (pts.length < 2) return Number.POSITIVE_INFINITY;
  let dMin = Number.POSITIVE_INFINITY;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    dMin = Math.min(dMin, Math.sqrt(distPointSegmentSq(p.x, p.y, a.x, a.y, b.x, b.y)));
  }
  return dMin;
}

function distToConstraint(c: ConstraintView, p: Vec2): number {
  if (c.kind === "rope") {
    return minDistAlongPolyline(p, c.path);
  }
  if (c.kind === "spring") {
    return minDistAlongPolyline(p, springHitPolyline(c.a.x, c.a.y, c.b.x, c.b.y, c.restLength));
  }
  if (c.kind === "hinge") {
    return Math.hypot(p.x - c.anchor.x, p.y - c.anchor.y);
  }
  if (c.kind === "pulley") {
    const segs: Array<[number, number, number, number]> = [
      [c.anchorA.x, c.anchorA.y, c.groundA.x, c.groundA.y],
      [c.anchorB.x, c.anchorB.y, c.groundB.x, c.groundB.y],
    ];
    let dMin = Number.POSITIVE_INFINITY;
    for (const [ax, ay, bx, by] of segs) {
      dMin = Math.min(dMin, Math.sqrt(distPointSegmentSq(p.x, p.y, ax, ay, bx, by)));
    }
    const rim = Math.max(c.halfSpread * 1.05, 0.06);
    dMin = Math.min(
      dMin,
      Math.abs(Math.hypot(p.x - c.wheelCenter.x, p.y - c.wheelCenter.y) - rim),
    );
    return dMin;
  }
  if (c.kind === "belt") {
    return minDistAlongPolyline(p, c.path);
  }
  if (c.kind === "weld") {
    // welds are invisible; not user-selectable
    return Number.POSITIVE_INFINITY;
  }
  if (c.kind === "bar") {
    return Math.sqrt(distPointSegmentSq(p.x, p.y, c.a.x, c.a.y, c.b.x, c.b.y));
  }
  return Number.POSITIVE_INFINITY;
}

export const CONSTRAINT_PICK_RADIUS = 0.07;

/**
 * Pick the closest constraint edge to `p` within `maxDist` world units.
 */
export function pickClosestConstraint(
  constraints: readonly ConstraintView[],
  p: Vec2,
  maxDist: number,
): Id | null {
  let best: Id | null = null;
  let bestD = Number.POSITIVE_INFINITY;
  for (const c of constraints) {
    const d = distToConstraint(c, p);
    if (d <= maxDist && (best === null || d < bestD - 1e-9)) {
      bestD = d;
      best = c.id;
    }
  }
  return best;
}
