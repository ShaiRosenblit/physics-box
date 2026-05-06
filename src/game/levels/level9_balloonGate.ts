import { ball, box, balloon, rope, worldAnchor, bodyAnchor } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 9 — Balloon Gate.
 *
 * A marble rolls along an elevated track toward the bucket. A light cork
 * gate hangs from the ceiling on a rope, blocking the marble's path.
 * The player places two balloons below the gate — they float upward,
 * push the gate up until the rope goes slack, and the marble rolls
 * under and on to the bucket.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // Elevated track on the left of the gate (marble rolls right along it).
  world.add(
    box({
      position: { x: -3.5, y: 3 },
      width: 5.5,
      height: 0.15,
      angle: -0.04, // very gentle downhill tilt to the right
      fixed: true,
      material: "wood",
    }),
  );

  // Elevated track on the right of the gate.
  world.add(
    box({
      position: { x: 3.5, y: 2.88 },
      width: 5.5,
      height: 0.15,
      fixed: true,
      material: "wood",
    }),
  );

  // Marble on the left track.
  const marbleId = world.add(
    ball({
      position: { x: -5, y: 3.35 },
      radius: 0.15,
      material: "metal",
      angularDamping: 0.04,
      linearDamping: 0.01,
    }),
  );

  // Cork gate hanging from the ceiling.
  // Ceiling is at y = 12 (addWorkshopEnclosure default interiorHeight = 12).
  const gateX = 0.7;
  const gateW = 1.1;
  const gateH = 0.9;
  const gateCenterY = 3.3; // bottom of gate at ~2.85, just above track surface
  const ceilingY = 12;
  const ropeLength = ceilingY - gateCenterY; // rope lets gate hang exactly here

  const gateId = world.add(
    box({
      position: { x: gateX, y: gateCenterY },
      width: gateW,
      height: gateH,
      material: "cork",
      linearDamping: 0.8,
      angularDamping: 2.0,
    }),
  );

  // Rope from ceiling anchor to gate center: prevents gate from falling lower.
  world.addConstraint(
    rope({
      a: worldAnchor({ x: gateX, y: ceilingY }),
      b: bodyAnchor(gateId),
      length: ropeLength,
      segments: 0,
    }),
  );

  // Bucket at the end of the right track (marble falls off and lands here).
  const bucketCx = 5.5;
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

export const level9BalloonGate: Level = {
  id: "level9_balloonGate",
  title: "Level 9 — Balloon Gate",
  goalText: "Float the gate up with balloons so the marble can roll through.",
  setupScene,
  palette: {
    balloon: { count: 2 },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -8, minY: -0.5, maxX: 8, maxY: 10 },
};
