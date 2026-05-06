import { ball, box } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 21 — Bumper Bounce.
 *
 * A super-bouncy cork marble rolls down a left-hand ramp and shoots
 * across the floor. The bucket sits on a tall pedestal too high for
 * the marble to reach by simple ballistic flight — but the marble's
 * very high restitution turns any flat surface into a mini-trampoline.
 * The player drops one or two fixed wooden boxes; the marble strikes
 * the box top and is launched into a much taller arc that drops it
 * cleanly into the bucket.
 *
 * Restitution is the puzzle: it's the first level where bounce energy
 * matters more than ramps or stacks.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // ----- Release ramp upper-left -----
  const rampAngle = -0.18;
  const rampCx = -3.5;
  const rampCy = 3.5;
  world.add(
    box({
      position: { x: rampCx, y: rampCy },
      width: 4.5,
      height: 0.18,
      angle: rampAngle,
      fixed: true,
      material: "wood",
    }),
  );

  // ----- Cork marble — explicit fixtureRestitution gives it the snap of
  // a rubber ball without changing the cork material defaults globally.
  const cosA = Math.cos(rampAngle);
  const sinA = Math.sin(rampAngle);
  const rampTopOffset = -2.0;
  const rampTopX = rampCx + cosA * rampTopOffset;
  const rampTopY = rampCy + sinA * rampTopOffset;
  const marbleR = 0.18;
  const marbleId = world.add(
    ball({
      position: { x: rampTopX, y: rampTopY + 0.45 },
      radius: marbleR,
      material: "cork",
      fixtureRestitution: 0.85,
      fixtureFriction: 0.05,
      angularDamping: 0.04,
      linearDamping: 0.0,
    }),
  );

  // ----- Bucket on a tall pedestal, far right -----
  const bucketCx = 3.0;
  const bucketBaseY = 3.0;
  const wallH = 1.0;
  const bucketHalfW = 0.85;
  const wallT = 0.12;

  // Pedestal placed flush with the bucket's right wall so the marble's
  // approach arc from the upper-left has unobstructed access to the
  // bucket mouth.
  const pedestalX = bucketCx + bucketHalfW + 0.18;
  world.add(
    box({
      position: { x: pedestalX, y: bucketBaseY / 2 },
      width: 0.14,
      height: bucketBaseY,
      fixed: true,
      material: "wood",
    }),
  );
  world.add(
    box({
      position: { x: pedestalX - 0.14, y: bucketBaseY - 0.06 },
      width: 0.32,
      height: 0.1,
      fixed: true,
      material: "wood",
    }),
  );

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
    trackedBodies: { marble: marbleId },
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

export const level21BumperBounce: Level = {
  id: "level21_bumperBounce",
  title: "Level 21 — Bumper Bounce",
  goalText: "Place a bumper to spring the bouncy marble up to the bucket.",
  setupScene,
  palette: {
    box: { count: 2, fixed: true },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -7, minY: -0.5, maxX: 6, maxY: 7 },
};
