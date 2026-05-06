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
  // Mirrors the working `catapult` scene in src/simulation/scenes/catapult.
  // Critically the hinge here connects the arm to the post (bodyA + bodyB),
  // not arm-to-world. With a world-anchor-only hinge the arm body and the
  // post body would still collide every frame at the pivot, which pinned
  // the spring and prevented release in the original L12 setup.
  const pivot = { x: -4.5, y: 0.38 };
  const armW = 2.85;
  const armH = 0.13;
  const armAngle = (40 * Math.PI) / 180; // cocked angle

  const cos = Math.cos(armAngle);
  const sin = Math.sin(armAngle);

  // Base platform under the catapult.
  world.add(
    box({
      position: { x: -5.4, y: 0.075 },
      width: 2.6,
      height: 0.15,
      fixed: true,
      material: "wood",
    }),
  );

  // Pivot post (short — the cocked arm reaches just over its top).
  const postId = world.add(
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
      linearDamping: 0.02,
    }),
  );

  world.addConstraint(
    hinge({
      bodyA: armId,
      bodyB: postId,
      worldAnchor: pivot,
    }),
  );

  // Spring: anchor sits behind the frame so the spring is taut while
  // cocked. Releasing it pulls the arm tail forward and swings the long
  // tip up-and-over, flinging the cork projectile to the right. These
  // parameters match the working sandbox catapult scene (verified by
  // catapultScene.test).
  const springAnchorX = pivot.x - 1.27;
  const springAnchorY = pivot.y - 0.12;
  world.addConstraint(
    spring({
      a: worldAnchor({ x: springAnchorX, y: springAnchorY }),
      b: bodyAnchor(armId, { x: -armW / 2, y: 0 }),
      restLength: 0.72,
      frequencyHz: 8,
      dampingRatio: 0.22,
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

  // ── Obstacle barrier ────────────────────────────────────────────────
  // A short fence that the natural cork-shot arc just clips, so the
  // marble lands SHORT of the bucket without help. The two player boxes
  // are used as ramps to lift the shot trajectory clear and steer it
  // into the bucket. (The original "tall wall" version of this level
  // was unsolvable: the catapult's cork-shot range is roughly 1.5 units
  // forward from the launch perch, well short of a 4.4-tall obstacle
  // plus a far bucket.)
  world.add(
    box({
      position: { x: -1.4, y: 0.45 },
      width: 0.2,
      height: 0.9,
      fixed: true,
      material: "wood",
    }),
  );

  // ── Bucket beyond the barrier ───────────────────────────────────────
  const bucketCx = -0.5;
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
