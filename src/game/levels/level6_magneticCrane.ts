import { ball, box } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 6 — Magnetic Crane.
 *
 * A metal marble is trapped in a shallow pit at the floor. The bucket
 * sits on a high shelf to the right. The player has two north-pole
 * magnets to place: one above the pit to pull the marble up, another
 * above the shelf to draw it across and into the cup.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // Pit walls at floor level trapping the marble.
  const pitCx = -3;
  const pitHalfW = 0.6;
  const pitWallH = 1.0;
  const pitWallT = 0.15;
  world.add(
    box({
      position: { x: pitCx - pitHalfW, y: pitWallH / 2 },
      width: pitWallT,
      height: pitWallH,
      fixed: true,
      material: "wood",
    }),
  );
  world.add(
    box({
      position: { x: pitCx + pitHalfW, y: pitWallH / 2 },
      width: pitWallT,
      height: pitWallH,
      fixed: true,
      material: "wood",
    }),
  );

  // Metal marble sitting in the pit.
  const marbleId = world.add(
    ball({
      position: { x: pitCx, y: 0.3 },
      radius: 0.18,
      material: "metal",
      angularDamping: 0.04,
      linearDamping: 0.02,
    }),
  );

  // High shelf on the right (surface at y = 5).
  world.add(
    box({
      position: { x: 4, y: 2.5 },
      width: 4.5,
      height: 5,
      fixed: true,
      material: "wood",
    }),
  );

  // Bucket on top of the shelf.
  const bucketCx = 3.5;
  const bucketBaseY = 5;
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

export const level6MagneticCrane: Level = {
  id: "level6_magneticCrane",
  title: "Level 6 — Magnetic Crane",
  goalText: "Use magnets to lift the marble out of the pit and onto the high shelf.",
  setupScene,
  palette: {
    "magnet+": { count: 2, fixed: true },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -6, minY: -0.5, maxX: 8, maxY: 9 },
};
