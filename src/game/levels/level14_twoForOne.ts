import { ball, box } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 14 — Two for One.
 *
 * Two marbles roll in from opposite ramps and both must land in the
 * single central bucket. Without help each marble overshoots to the
 * opposite side. The player places three boxes to redirect both marbles
 * into the cup at the same time.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // Left ramp (tilts down to the right).
  const leftRampAngle = -0.22;
  world.add(
    box({
      position: { x: -4.5, y: 6 },
      width: 4.5,
      height: 0.2,
      angle: leftRampAngle,
      fixed: true,
      material: "wood",
    }),
  );

  // Right ramp (tilts down to the left, mirror).
  const rightRampAngle = 0.22;
  world.add(
    box({
      position: { x: 4.5, y: 6 },
      width: 4.5,
      height: 0.2,
      angle: rightRampAngle,
      fixed: true,
      material: "wood",
    }),
  );

  // Left marble at the high end of the left ramp.
  const lcA = Math.cos(leftRampAngle);
  const lsA = Math.sin(leftRampAngle);
  const leftRampLeft = { x: -4.5 + lcA * -2.1, y: 6 + lsA * -2.1 };
  const marbleAId = world.add(
    ball({
      position: { x: leftRampLeft.x, y: leftRampLeft.y + 0.38 },
      radius: 0.17,
      material: "metal",
      angularDamping: 0.04,
      linearDamping: 0.01,
    }),
  );

  // Right marble at the high end of the right ramp.
  const rcA = Math.cos(rightRampAngle);
  const rsA = Math.sin(rightRampAngle);
  const rightRampRight = { x: 4.5 + rcA * 2.1, y: 6 + rsA * 2.1 };
  const marbleBId = world.add(
    ball({
      position: { x: rightRampRight.x, y: rightRampRight.y + 0.38 },
      radius: 0.17,
      material: "metal",
      angularDamping: 0.04,
      linearDamping: 0.01,
    }),
  );

  // Central bucket at the floor.
  const bucketCx = 0;
  const bucketBaseY = 0;
  const wallH = 1.1;
  const bucketHalfW = 0.8;
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
    trackedBodies: { marbleA: marbleAId, marbleB: marbleBId },
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

export const level14TwoForOne: Level = {
  id: "level14_twoForOne",
  title: "Level 14 — Two for One",
  goalText: "Guide both marbles into the single central bucket.",
  setupScene,
  palette: {
    box: { count: 3, fixed: true },
  },
  goal: {
    kind: "allBodiesInZone",
    bodyRefs: ["marbleA", "marbleB"],
    zoneId: "bucket",
  },
  viewBounds: { minX: -8, minY: -0.5, maxX: 8, maxY: 9 },
};
