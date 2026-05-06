import { ball, box } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 13 — Coulomb Balance.
 *
 * Two fixed positive charges sit symmetrically on either side of a
 * positively charged marble. The equal repulsions cancel and the marble
 * sits in unstable equilibrium. The player places one negatively charged
 * ball to break the symmetry — the attraction tips the balance and the
 * marble shoots across to the bucket on the far side.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // Fixed positive anchor charges (scene elements, not player tools).
  world.add(
    ball({
      position: { x: -3.5, y: 0.4 },
      radius: 0.2,
      material: "metal",
      // Weakened from 4 to 2: at +4 each, the equal-and-opposite repulsion
      // produced a deep enough potential well that a single player ball−
      // could barely budge the marble (best result was a 0.8-unit nudge).
      // At +2 the balance is more delicate, so the player's −4 charge can
      // actually break it.
      charge: 2,
      fixed: true,
    }),
  );
  world.add(
    ball({
      position: { x: 3.5, y: 0.4 },
      radius: 0.2,
      material: "metal",
      // Weakened from 4 to 2: at +4 each, the equal-and-opposite repulsion
      // produced a deep enough potential well that a single player ball−
      // could barely budge the marble (best result was a 0.8-unit nudge).
      // At +2 the balance is more delicate, so the player's −4 charge can
      // actually break it.
      charge: 2,
      fixed: true,
    }),
  );

  // The marble at equilibrium between them.
  const marbleId = world.add(
    ball({
      position: { x: 0, y: 0.4 },
      radius: 0.16,
      material: "metal",
      charge: 3,
      angularDamping: 0.04,
      linearDamping: 0.01,
    }),
  );

  // Low guide walls to keep everything at the same height as it rolls.
  world.add(
    box({
      position: { x: 0, y: 0.2 },
      width: 14,
      height: 0.4,
      fixed: true,
      material: "felt",
      fixtureRestitution: 0.05,
      fixtureFriction: 0.9,
    }),
  );

  // Bucket on the right floor.
  const bucketCx = 5.5;
  const bucketBaseY = 0.4;
  const wallH = 0.9;
  const bucketHalfW = 0.6;
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

export const level13CoulombBalance: Level = {
  id: "level13_coulombBalance",
  title: "Level 13 — Coulomb Balance",
  goalText: "Break the symmetry with a negative charge to send the marble into the bucket.",
  setupScene,
  palette: {
    "ball-": { count: 1, fixed: true },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -7, minY: -0.5, maxX: 8, maxY: 5 },
};
