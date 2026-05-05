import { ball, box } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 3 — Coulomb's Catch.
 *
 * A positively charged marble rolls down a tilted ramp and flies off
 * the right edge into open air. The bucket sits on the floor far to
 * the right — too far for the marble to reach unaided; left alone it
 * lands short. Place negatively charged balls along the floor to
 * attract the marble across the gap and into the cup.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // Tilted ramp at upper-left.
  const rampAngle = -0.2;
  world.add(
    box({
      position: { x: -4, y: 6 },
      width: 4.5,
      height: 0.2,
      angle: rampAngle,
      fixed: true,
      material: "wood",
    }),
  );

  // Charged marble (positive) starts at the upper end of the ramp.
  const cos = Math.cos(rampAngle);
  const sin = Math.sin(rampAngle);
  const rampLeft = { x: -4 + cos * -2, y: 6 + sin * -2 };
  const marbleId = world.add(
    ball({
      position: { x: rampLeft.x, y: rampLeft.y + 0.35 },
      radius: 0.16,
      material: "metal",
      charge: 4,
      angularDamping: 0.04,
      linearDamping: 0.01,
    }),
  );

  // Bucket far to the right.
  const bucketCx = 5;
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

export const level3CoulombCatch: Level = {
  id: "level3_coulombCatch",
  title: "Level 3 — Coulomb's Catch",
  goalText: "Pull the positive marble across the gap with negative charges.",
  setupScene,
  palette: {
    "ball-": { count: 2, fixed: true },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -8, minY: -0.5, maxX: 7, maxY: 8 },
};
