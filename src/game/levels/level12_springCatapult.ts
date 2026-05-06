import { ball, box, hinge, spring, worldAnchor, bodyAnchor } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 12 — Spring Catapult.
 *
 * A spring-arm catapult sits on the left: a wooden arm is hinged to a
 * post and held cocked by a compressed spring. When the simulation
 * starts the spring releases, the arm swings, and a cork ball is flung
 * to the right. A dividing wall blocks the natural landing zone — the
 * player places two boxes to ramp or deflect the flying ball over the
 * wall and into the bucket beyond.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // ── Catapult mechanism ────────────────────────────────────────────────
  const pivot = { x: -4.5, y: 0.4 };
  const armW = 2.8;
  const armH = 0.13;
  const armAngle = (38 * Math.PI) / 180; // cocked angle

  const cos = Math.cos(armAngle);
  const sin = Math.sin(armAngle);

  // Base platform under the catapult.
  world.add(
    box({
      position: { x: -5.5, y: 0.1 },
      width: 3.2,
      height: 0.2,
      fixed: true,
      material: "wood",
    }),
  );

  // Pivot post.
  world.add(
    box({
      position: { x: pivot.x, y: pivot.y / 2 },
      width: 0.14,
      height: pivot.y,
      fixed: true,
      material: "wood",
    }),
  );

  // Arm (centered, then offset so pivot is near one end).
  const armCx = pivot.x + (armW / 2) * cos;
  const armCy = pivot.y + (armW / 2) * sin;
  const armId = world.add(
    box({
      position: { x: armCx, y: armCy },
      width: armW,
      height: armH,
      angle: armAngle,
      material: "wood",
      angularDamping: 0.08,
      linearDamping: 0.01,
    }),
  );

  world.addConstraint(
    hinge({
      bodyA: armId,
      worldAnchor: pivot,
    }),
  );

  // Spring: anchor is behind and below the pivot; attached to the short
  // tail of the arm so the spring is already compressed at rest.
  const springAnchorX = pivot.x - 0.8;
  const springAnchorY = pivot.y - 0.1;
  world.addConstraint(
    spring({
      a: worldAnchor({ x: springAnchorX, y: springAnchorY }),
      b: bodyAnchor(armId, { x: -armW / 2, y: 0 }),
      restLength: 0.65,
      frequencyHz: 9,
      dampingRatio: 0.18,
    }),
  );

  // Cork projectile perched at the long tip of the arm.
  const ballR = 0.11;
  const perch = armH / 2 + ballR + 0.01;
  const tipX = pivot.x + armW * cos;
  const tipY = pivot.y + armW * sin;
  const ballPos = {
    x: tipX - sin * perch,
    y: tipY + cos * perch,
  };
  const ballId = world.add(
    ball({
      position: ballPos,
      radius: ballR,
      material: "cork",
      angularDamping: 0.05,
      linearDamping: 0.01,
    }),
  );

  // ── Obstacle wall ────────────────────────────────────────────────────
  // A wall that the ball's natural arc cannot clear unaided.
  world.add(
    box({
      position: { x: 0.5, y: 2.2 },
      width: 0.2,
      height: 4.4,
      fixed: true,
      material: "wood",
    }),
  );

  // ── Bucket beyond the wall ───────────────────────────────────────────
  const bucketCx = 4.5;
  const bucketBaseY = 0;
  const wallH = 1.0;
  const bucketHalfW = 0.7;
  const wallT = 0.12;
  world.add(
    box({
      position: { x: bucketCx - bucketHalfW, y: bucketBaseY + wallH / 2 },
      width: wallT,
      height: wallH,
      fixed: true,
      material: "wood",
    }),
  );
  world.add(
    box({
      position: { x: bucketCx + bucketHalfW, y: bucketBaseY + wallH / 2 },
      width: wallT,
      height: wallH,
      fixed: true,
      material: "wood",
    }),
  );

  return {
    trackedBodies: { marble: ballId },
    goalZones: [
      {
        id: "bucket",
        label: "Bucket",
        center: { x: bucketCx, y: bucketBaseY + wallH / 2 },
        halfExtents: { x: bucketHalfW - wallT / 2, y: wallH / 2 },
      },
    ],
  };
};

export const level12SpringCatapult: Level = {
  id: "level12_springCatapult",
  title: "Level 12 — Spring Catapult",
  goalText: "Deflect the catapult's projectile over the wall and into the bucket.",
  setupScene,
  palette: {
    box: { count: 2, fixed: true },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -8, minY: -0.5, maxX: 7, maxY: 8 },
};
