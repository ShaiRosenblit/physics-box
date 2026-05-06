import { ball, box } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 5 — Step Up.
 *
 * A marble rolls off a ramp at the upper left. The bucket sits on top of
 * a raised platform to the right — too high for the marble to reach
 * unaided. The player has three boxes to build a staircase or launch ramp
 * up to the platform.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // Inclined release ramp at upper-left.
  const rampAngle = -0.18;
  world.add(
    box({
      position: { x: -4.5, y: 6.5 },
      width: 5,
      height: 0.2,
      angle: rampAngle,
      fixed: true,
      material: "wood",
    }),
  );

  // Marble at the high end of the ramp.
  const cos = Math.cos(rampAngle);
  const sin = Math.sin(rampAngle);
  const rampLeft = { x: -4.5 + cos * -2.3, y: 6.5 + sin * -2.3 };
  const marbleId = world.add(
    ball({
      position: { x: rampLeft.x, y: rampLeft.y + 0.4 },
      radius: 0.18,
      material: "metal",
      angularDamping: 0.04,
      linearDamping: 0.01,
    }),
  );

  // Raised platform the marble must reach (surface at y = 3).
  world.add(
    box({
      position: { x: 3.5, y: 1.5 },
      width: 5,
      height: 3,
      fixed: true,
      material: "wood",
    }),
  );

  // Bucket on top of the platform.
  const bucketCx = 3.5;
  const bucketBaseY = 3;
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

export const level5StepUp: Level = {
  id: "level5_stepUp",
  title: "Level 5 — Step Up",
  goalText: "Build a staircase to reach the raised bucket.",
  setupScene,
  palette: {
    box: { count: 3, fixed: true },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -8, minY: -0.5, maxX: 7, maxY: 9 },
};
