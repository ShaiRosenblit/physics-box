import { ball, box } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 11 — Magnet Relay.
 *
 * A metal marble starts at the lower-left. To reach the bucket at the
 * far upper-right, it must navigate around two staggered walls that
 * block any straight path. The player places three north-pole magnets
 * as relay stations — each one pulls the marble around a corner and
 * passes it toward the next until it reaches the bucket.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // Metal marble at lower-left.
  const marbleId = world.add(
    ball({
      position: { x: -5.5, y: 0.3 },
      radius: 0.18,
      material: "metal",
      angularDamping: 0.04,
      linearDamping: 0.02,
    }),
  );

  // First baffle wall — blocks the low path to the right.
  world.add(
    box({
      position: { x: -2, y: 2.5 },
      width: 0.2,
      height: 5,
      fixed: true,
      material: "wood",
    }),
  );

  // Second baffle wall — blocks the mid path to the right.
  world.add(
    box({
      position: { x: 1.5, y: 4 },
      width: 0.2,
      height: 5,
      fixed: true,
      material: "wood",
    }),
  );

  // Bucket at the upper-right.
  const bucketCx = 4.5;
  const bucketBaseY = 6;
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

export const level11MagnetRelay: Level = {
  id: "level11_magnetRelay",
  title: "Level 11 — Magnet Relay",
  goalText: "Guide the marble around both walls with a chain of magnets.",
  setupScene,
  palette: {
    "magnet+": { count: 3, fixed: true },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -7, minY: -0.5, maxX: 7, maxY: 10 },
};
