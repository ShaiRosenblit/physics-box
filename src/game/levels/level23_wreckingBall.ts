import { ball, box, rope, worldAnchor, bodyAnchor } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 23 — Wrecking Ball.
 *
 * A heavy metal pendulum hangs cocked back at 60° from vertical. The
 * moment the simulation starts gravity drops it; at the bottom of the
 * arc it slams into a small cork marble sitting on a low shelf. The
 * marble flies right, but a wall blocks the direct path to the bucket
 * on the far side. The player has two fixed boxes and must position them
 * to catch the marble's parabola and bounce it up over the wall and
 * into the bucket.
 *
 * This is the first level whose mechanism *runs on its own* — the swing
 * is purely automatic. The player's job is to read the launched arc and
 * choose where to land a stepping-stone bumper.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // ----- Pendulum: heavy metal bob on a rigid rope, cocked left -----
  const anchorX = -3.5;
  const anchorY = 6.5;
  const ropeLength = 4.0;
  const cockAngleRad = (60 * Math.PI) / 180;
  const bobInitial = {
    x: anchorX - ropeLength * Math.sin(cockAngleRad),
    y: anchorY - ropeLength * Math.cos(cockAngleRad),
  };
  const bobR = 0.36;
  const bobId = world.add(
    ball({
      position: bobInitial,
      radius: bobR,
      material: "metal",
      angularDamping: 0.05,
      linearDamping: 0.0,
    }),
  );
  // Rigid-link rope — segments=0 means a single distance constraint, so the
  // pendulum is a true point-mass on a string instead of a chain.
  world.addConstraint(
    rope({
      a: worldAnchor({ x: anchorX, y: anchorY }),
      b: bodyAnchor(bobId),
      length: ropeLength,
      segments: 0,
    }),
  );

  // ----- Strike shelf and marble on the right -----
  // The bob's bottom-of-swing center is at (anchorX, anchorY − ropeLength).
  // We sit the marble centered on that y so the strike is as close to
  // a horizontal smash as the geometry allows.
  const strikeY = anchorY - ropeLength;
  const marbleR = 0.16;
  const shelfThickness = 0.12;
  const shelfTop = strikeY - marbleR;
  const shelfLeft = anchorX + bobR + marbleR + 0.05;
  const shelfRight = shelfLeft + 1.6;
  world.add(
    box({
      position: {
        x: (shelfLeft + shelfRight) / 2,
        y: shelfTop - shelfThickness / 2,
      },
      width: shelfRight - shelfLeft,
      height: shelfThickness,
      fixed: true,
      material: "wood",
    }),
  );
  // Pillar that visually anchors the shelf to the floor.
  world.add(
    box({
      position: { x: shelfRight - 0.1, y: shelfTop / 2 },
      width: 0.12,
      height: shelfTop - shelfThickness,
      fixed: true,
      material: "wood",
    }),
  );

  const marbleId = world.add(
    ball({
      position: { x: shelfLeft + 0.05, y: strikeY },
      radius: marbleR,
      material: "cork",
      fixtureRestitution: 0.6,
      fixtureFriction: 0.2,
      angularDamping: 0.05,
      linearDamping: 0.01,
    }),
  );

  // ----- Wall blocking the direct floor path to the bucket -----
  const wallX = 3.5;
  const wallH = 1.6;
  world.add(
    box({
      position: { x: wallX, y: wallH / 2 },
      width: 0.22,
      height: wallH,
      fixed: true,
      material: "wood",
    }),
  );

  // ----- Bucket on the far right -----
  const bucketCx = 5.5;
  const bucketBaseY = 0;
  const bucketWallH = 1.0;
  const bucketHalfW = 0.7;
  const bucketWallT = 0.12;
  world.add(
    box({
      position: {
        x: bucketCx - bucketHalfW,
        y: bucketBaseY + bucketWallH / 2,
      },
      width: bucketWallT,
      height: bucketWallH,
      fixed: true,
      material: "wood",
    }),
  );
  world.add(
    box({
      position: {
        x: bucketCx + bucketHalfW,
        y: bucketBaseY + bucketWallH / 2,
      },
      width: bucketWallT,
      height: bucketWallH,
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
        center: { x: bucketCx, y: bucketBaseY + bucketWallH / 2 },
        halfExtents: {
          x: bucketHalfW - bucketWallT / 2,
          y: bucketWallH / 2,
        },
      },
    ],
  };
};

export const level23WreckingBall: Level = {
  id: "level23_wreckingBall",
  title: "Level 23 — Wrecking Ball",
  goalText: "Read the swing. Place stepping stones to bounce the launched marble over the wall.",
  setupScene,
  palette: {
    box: { count: 2, fixed: true },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -8, minY: -0.5, maxX: 7, maxY: 8 },
};
