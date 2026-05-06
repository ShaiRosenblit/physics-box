import { ball, box, hinge } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 10 — Seesaw.
 *
 * A wooden plank is balanced on a pivot post. A light cork marble sits
 * on the right end of the plank. The bucket hangs directly above the
 * right end. The player drops a heavy box on the left end — the left
 * side sinks, the right side rises, and the marble is launched upward
 * into the bucket.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // Pivot post.
  const pivotX = 0;
  const pivotY = 2.5;
  world.add(
    box({
      position: { x: pivotX, y: pivotY / 2 },
      width: 0.16,
      height: pivotY,
      fixed: true,
      material: "metal",
    }),
  );

  // Seesaw plank, initially horizontal and centered on the pivot.
  const plankW = 6.5;
  const plankH = 0.14;
  const plankId = world.add(
    box({
      position: { x: pivotX, y: pivotY },
      width: plankW,
      height: plankH,
      material: "wood",
      angularDamping: 0.15,
      linearDamping: 0,
    }),
  );

  // Hinge the plank to the world at the pivot point.
  world.addConstraint(
    hinge({
      bodyA: plankId,
      worldAnchor: { x: pivotX, y: pivotY },
    }),
  );

  // Cork marble on the right end of the plank.
  const marbleX = pivotX + plankW / 2 - 0.4;
  const marbleId = world.add(
    ball({
      position: { x: marbleX, y: pivotY + plankH / 2 + 0.16 },
      radius: 0.16,
      material: "cork",
      angularDamping: 0.06,
      linearDamping: 0.01,
    }),
  );

  // Bucket directly above the marble launch point.
  const bucketCx = marbleX;
  const bucketBaseY = 7.5;
  const wallH = 0.9;
  const bucketHalfW = 0.55;
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

export const level10Seesaw: Level = {
  id: "level10_seesaw",
  title: "Level 10 — Seesaw",
  goalText: "Drop a counterweight on the left end to launch the marble into the bucket above.",
  setupScene,
  palette: {
    box: { count: 1 },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -6, minY: -0.5, maxX: 6, maxY: 10 },
};
