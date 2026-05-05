import { ball, box } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 4 — Push Off.
 *
 * A positively charged marble rests in a shallow cradle at the floor.
 * A short wall to the right separates it from the bucket. Drop another
 * positively charged ball nearby — like charges repel — and the marble
 * is shoved over the wall into the bucket. A single box is also
 * available if a small ramp helps line up the trajectory.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // Cradle: two short fixed walls keep the charged marble pinned at
  // rest until something pushes it sideways.
  const cradleCx = -3;
  const cradleHalfW = 0.32;
  const cradleWallH = 0.5;
  const cradleWallT = 0.12;
  world.add(
    box({
      position: {
        x: cradleCx - cradleHalfW,
        y: cradleWallH / 2,
      },
      width: cradleWallT,
      height: cradleWallH,
      fixed: true,
      material: "wood",
    }),
  );
  world.add(
    box({
      position: {
        x: cradleCx + cradleHalfW,
        y: cradleWallH / 2,
      },
      width: cradleWallT,
      height: cradleWallH,
      fixed: true,
      material: "wood",
    }),
  );

  // Charged marble sitting in the cradle.
  const marbleId = world.add(
    ball({
      position: { x: cradleCx, y: cradleWallH + 0.18 },
      radius: 0.18,
      material: "metal",
      charge: 4,
      angularDamping: 0.05,
      linearDamping: 0.02,
    }),
  );

  // Barrier wall between marble and bucket.
  world.add(
    box({
      position: { x: 0, y: 0.6 },
      width: 0.2,
      height: 1.2,
      fixed: true,
      material: "wood",
    }),
  );

  // Bucket on the right.
  const bucketCx = 3;
  const bucketBaseY = 0;
  const wallH = 1.0;
  const bucketHalfW = 0.7;
  const bucketWallT = 0.12;
  world.add(
    box({
      position: { x: bucketCx - bucketHalfW, y: bucketBaseY + wallH / 2 },
      width: bucketWallT,
      height: wallH,
      fixed: true,
      material: "wood",
    }),
  );
  world.add(
    box({
      position: { x: bucketCx + bucketHalfW, y: bucketBaseY + wallH / 2 },
      width: bucketWallT,
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
        halfExtents: { x: bucketHalfW - bucketWallT / 2, y: wallH / 2 },
      },
    ],
  };
};

export const level4PushOff: Level = {
  id: "level4_pushOff",
  title: "Level 4 — Push Off",
  goalText: "Repel the marble out of its cradle and over the wall into the bucket.",
  setupScene,
  palette: {
    "ball+": { count: 2, fixed: true },
    box: { count: 1, fixed: true },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -5, minY: -0.5, maxX: 5.5, maxY: 4 },
};
