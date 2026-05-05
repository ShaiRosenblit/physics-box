import { ball, box } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 1 — Drop the marble into the bucket.
 *
 * The marble sits on a tilted ramp at the upper-left. A bucket waits on
 * the floor to the lower-right, separated from the ramp end by a tall
 * wooden barrier. The player has three boxes to place; one common
 * solution is to lay a bridge over the barrier.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // Inclined release ramp. Angle is small so the marble accelerates
  // gently — strong enough to clear the lip with a well-placed bridge.
  const rampAngle = -0.18;
  world.add(
    box({
      position: { x: -4, y: 5 },
      width: 5,
      height: 0.2,
      angle: rampAngle,
      fixed: true,
      material: "wood",
    }),
  );

  // Marble starts perched at the upper end of the ramp.
  const cos = Math.cos(rampAngle);
  const sin = Math.sin(rampAngle);
  const rampLeft = { x: -4 + cos * -2.3, y: 5 + sin * -2.3 };
  const marbleId = world.add(
    ball({
      position: { x: rampLeft.x, y: rampLeft.y + 0.4 },
      radius: 0.18,
      material: "metal",
      angularDamping: 0.04,
      linearDamping: 0.01,
    }),
  );

  // Tall lip the marble can't clear unaided — the puzzle is to bridge it.
  world.add(
    box({
      position: { x: 0.4, y: 1.1 },
      width: 0.2,
      height: 2.2,
      fixed: true,
      material: "wood",
    }),
  );

  // Bucket: two short walls atop the workshop floor.
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

export const level1DropInBucket: Level = {
  id: "level1_dropInBucket",
  title: "Level 1 — Drop In",
  goalText: "Bridge the gap. Land the marble in the bucket.",
  setupScene,
  palette: {
    box: { count: 3, fixed: true },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -8, minY: -0.5, maxX: 7, maxY: 8 },
};
