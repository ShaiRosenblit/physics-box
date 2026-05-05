import { ball, box } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 2 — Magnetic Catch.
 *
 * A metal marble falls straight down a vertical chute. The bucket sits
 * on the floor offset to the right. With nothing in the way the marble
 * lands harmlessly between the chute and the bucket. The player has
 * two magnets to place — sit them on the floor near (or in) the bucket
 * to drag the falling marble sideways into the cup.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // Vertical drop chute at upper-left.
  const chuteX = -4;
  const chuteCenterY = 6;
  const chuteHeight = 5;
  const chuteHalfWidth = 0.32;
  const wallT = 0.15;

  world.add(
    box({
      position: { x: chuteX - chuteHalfWidth, y: chuteCenterY },
      width: wallT,
      height: chuteHeight,
      fixed: true,
      material: "wood",
    }),
  );
  world.add(
    box({
      position: { x: chuteX + chuteHalfWidth, y: chuteCenterY },
      width: wallT,
      height: chuteHeight,
      fixed: true,
      material: "wood",
    }),
  );

  const marbleId = world.add(
    ball({
      position: { x: chuteX, y: chuteCenterY + chuteHeight / 2 - 0.4 },
      radius: 0.16,
      material: "metal",
      angularDamping: 0.04,
      linearDamping: 0.01,
    }),
  );

  // Bucket offset to the right of the chute exit.
  const bucketCx = 1.6;
  const bucketBaseY = 0;
  const wallH = 1.0;
  const bucketHalfW = 0.6;
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

export const level2MagneticCatch: Level = {
  id: "level2_magneticCatch",
  title: "Level 2 — Magnetic Catch",
  goalText: "Pull the metal marble sideways with magnets and land it in the bucket.",
  setupScene,
  palette: {
    "magnet+": { count: 2, fixed: true },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -6, minY: -0.5, maxX: 4, maxY: 10 },
};
