import { describe, expect, test } from "vitest";
import type { Id, Snapshot } from "../simulation";
import type { Goal, LevelHandles } from "./types";
import { evaluateGoal } from "./winConditions";

const makeSnapshot = (
  bodies: Array<{ id: number; x: number; y: number }>,
): Snapshot =>
  ({
    tick: 0,
    time: 0,
    bodies: bodies.map((b) => ({
      id: b.id as unknown as Id,
      kind: "ball",
      position: { x: b.x, y: b.y },
      angle: 0,
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      material: "wood",
      charge: 0,
      fixed: false,
      linearDamping: 0,
      angularDamping: 0,
      buoyancyScale: 1,
      buoyancyLift: 0,
      radius: 0.1,
      collideDynamicBalls: true,
    })),
    constraints: [],
    charges: [],
    magnets: [],
  }) as unknown as Snapshot;

const handles: LevelHandles = {
  trackedBodies: { marble: 1 as unknown as Id },
  goalZones: [
    {
      id: "bucket",
      center: { x: 5, y: 1 },
      halfExtents: { x: 0.5, y: 0.5 },
    },
  ],
};

describe("evaluateGoal", () => {
  const goal: Goal = {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  };

  test("returns 'pending' when the body is outside the zone", () => {
    const snap = makeSnapshot([{ id: 1, x: 0, y: 0 }]);
    expect(evaluateGoal(snap, goal, handles)).toBe("pending");
  });

  test("returns 'won' when the body sits inside the zone", () => {
    const snap = makeSnapshot([{ id: 1, x: 5, y: 1 }]);
    expect(evaluateGoal(snap, goal, handles)).toBe("won");
  });

  test("returns 'pending' when the tracked body is missing from the snapshot", () => {
    const snap = makeSnapshot([{ id: 999, x: 5, y: 1 }]);
    expect(evaluateGoal(snap, goal, handles)).toBe("pending");
  });

  test("zone boundary: edge counts as inside", () => {
    const snap = makeSnapshot([{ id: 1, x: 5.5, y: 1 }]);
    expect(evaluateGoal(snap, goal, handles)).toBe("won");
  });

  test("just outside the zone is still pending", () => {
    const snap = makeSnapshot([{ id: 1, x: 5.51, y: 1 }]);
    expect(evaluateGoal(snap, goal, handles)).toBe("pending");
  });
});
