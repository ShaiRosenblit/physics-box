import { ball, box } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 7 — Over the Wall.
 *
 * A positively charged marble sits at rest on the left side of a very
 * tall wall. The bucket waits on the floor to the right. The player
 * places negatively charged balls to attract the marble up and over the
 * wall — the wall is too high to clear without gaining significant
 * upward velocity first.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // Positively charged marble on the left floor.
  const marbleId = world.add(
    ball({
      position: { x: -4, y: 0.3 },
      radius: 0.18,
      material: "metal",
      charge: 4,
      angularDamping: 0.04,
      linearDamping: 0.01,
    }),
  );

  // Very tall wall blocking direct path to the bucket.
  world.add(
    box({
      position: { x: -0.5, y: 3.5 },
      width: 0.25,
      height: 7,
      fixed: true,
      material: "wood",
    }),
  );

  // Bucket on the right floor.
  const bucketCx = 4;
  const bucketBaseY = 0;
  const wallH = 1.0;
  const bucketHalfW = 0.65;
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

export const level7OverTheWall: Level = {
  id: "level7_overTheWall",
  title: "Level 7 — Over the Wall",
  goalText: "Arc the positive marble over the tall wall with negative charges.",
  setupScene,
  palette: {
    "ball-": { count: 3, fixed: true },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -7, minY: -0.5, maxX: 7, maxY: 9 },
};
