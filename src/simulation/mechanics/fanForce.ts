import type { Id, Vec2 } from "../core/types";

export interface FanState {
  readonly id: Id;
  readonly position: Vec2;
  /** Body angle (rad). Cone axis is local +x rotated by `angle`. */
  readonly angle: number;
  readonly range: number;
  readonly halfAngle: number;
  readonly force: number;
}

export interface FanTargetBody {
  readonly id: Id;
  readonly position: Vec2;
}

/**
 * Compute the per-target additive force vector applied by every active
 * fan in `fans` to every dynamic body in `targets`. A target inside a
 * fan's cone receives a force along the cone axis with magnitude:
 *
 *   F = fan.force × (1 − d / range) × cos(α / halfAngle × π/2)
 *
 * Outside the cone (d ≥ range or |α| ≥ halfAngle), the contribution is 0.
 * The bell-shaped angular falloff makes the cone edge soft so puzzles do
 * not snap on/off when a body grazes the boundary.
 */
export function computeFanForces(
  fans: readonly FanState[],
  targets: readonly FanTargetBody[],
): Map<Id, Vec2> {
  const out = new Map<Id, Vec2>();
  if (fans.length === 0 || targets.length === 0) return out;

  for (const fan of fans) {
    if (fan.range <= 0 || fan.halfAngle <= 0 || fan.force === 0) continue;
    const ax = Math.cos(fan.angle);
    const ay = Math.sin(fan.angle);
    for (const t of targets) {
      const dx = t.position.x - fan.position.x;
      const dy = t.position.y - fan.position.y;
      const along = dx * ax + dy * ay;
      if (along <= 0 || along >= fan.range) continue;
      const perp = -dx * ay + dy * ax;
      const dist = Math.hypot(along, perp);
      if (dist < 1e-9) continue;
      const angleFromAxis = Math.atan2(Math.abs(perp), along);
      if (angleFromAxis >= fan.halfAngle) continue;

      const distFalloff = 1 - along / fan.range;
      const angularFalloff = Math.cos(
        (angleFromAxis / fan.halfAngle) * (Math.PI / 2),
      );
      const mag = fan.force * distFalloff * angularFalloff;

      const fx = mag * ax;
      const fy = mag * ay;
      const prev = out.get(t.id);
      if (prev) {
        out.set(t.id, { x: prev.x + fx, y: prev.y + fy });
      } else {
        out.set(t.id, { x: fx, y: fy });
      }
    }
  }
  return out;
}
