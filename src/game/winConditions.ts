import type { Id, Snapshot, Vec2 } from "../simulation";
import type { Goal, GoalZone, LevelHandles } from "./types";

export type GoalStatus = "pending" | "won";

function pointInZone(p: Vec2, zone: GoalZone): boolean {
  const dx = p.x - zone.center.x;
  const dy = p.y - zone.center.y;
  return (
    Math.abs(dx) <= zone.halfExtents.x && Math.abs(dy) <= zone.halfExtents.y
  );
}

function findZone(
  handles: LevelHandles,
  zoneId: string,
): GoalZone | undefined {
  return handles.goalZones.find((z) => z.id === zoneId);
}

function findBodyPos(snap: Snapshot, id: Id): Vec2 | null {
  const b = snap.bodies.find((x) => x.id === id);
  return b ? b.position : null;
}

/**
 * Evaluate the goal against the current snapshot. Pure — no side effects.
 * Returns "won" the moment the condition is satisfied; the caller decides
 * what to do (pause, transition phase, etc.).
 */
export function evaluateGoal(
  snap: Snapshot,
  goal: Goal,
  handles: LevelHandles,
): GoalStatus {
  if (goal.kind === "bodyInZone") {
    const id = handles.trackedBodies[goal.bodyRef];
    if (id === undefined) return "pending";
    const zone = findZone(handles, goal.zoneId);
    if (!zone) return "pending";
    const p = findBodyPos(snap, id);
    if (!p) return "pending";
    return pointInZone(p, zone) ? "won" : "pending";
  }

  if (goal.kind === "allBodiesInZone") {
    const zone = findZone(handles, goal.zoneId);
    if (!zone) return "pending";
    for (const ref of goal.bodyRefs) {
      const id = handles.trackedBodies[ref];
      if (id === undefined) return "pending";
      const p = findBodyPos(snap, id);
      if (!p || !pointInZone(p, zone)) return "pending";
    }
    return "won";
  }

  return "pending";
}
