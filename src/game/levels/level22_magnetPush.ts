import { box, magnet } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 22 — Magnet Push.
 *
 * The first level whose protagonist isn't a marble: a free-sliding bar
 * magnet ("the puck") sits in the middle of a low channel, oriented with
 * its north pole pointing right. The bucket is at the right end of the
 * channel. The player has both a fixed `magnet+` and a fixed `magnet-`
 * available; only one polarity, placed on the correct side, repels the
 * puck cleanly toward the bucket. Same poles repel, opposite poles
 * attract — which is the lesson.
 *
 * Geometry note: poles project along each magnet's local +x axis. Two
 * magnets with the same sign sitting on the same line are S-facing-N
 * (attractive); flipping one sign makes them face like-poles
 * (repulsive). The puck's high angular damping prevents the dipole-on-
 * dipole torque from rotating it mid-puzzle, which would otherwise scramble
 * the polarity intuition.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // ----- Channel walls (the floor of the channel is the workshop floor) -----
  const channelHalfH = 0.7;
  const channelLeft = -4.0;
  const channelRight = 4.0;
  const wallT = 0.15;
  // Channel ceiling — keeps the puck on the floor; the puck's dipole
  // would otherwise lift it slightly under odd alignments.
  world.add(
    box({
      position: { x: 0, y: channelHalfH * 2 + wallT / 2 },
      width: channelRight - channelLeft + 0.4,
      height: wallT,
      fixed: true,
      material: "wood",
    }),
  );
  // Left end-cap (closes the channel — keeps puck from escaping under
  // an unintended attraction).
  world.add(
    box({
      position: { x: channelLeft, y: channelHalfH },
      width: wallT,
      height: channelHalfH * 2,
      fixed: true,
      material: "wood",
    }),
  );

  // ----- Puck: free magnet body, oriented with north pointing right -----
  const puckR = 0.22;
  const puckId = world.add(
    magnet({
      position: { x: 0, y: puckR + 0.05 },
      radius: puckR,
      dipole: 30, // small enough that a stronger fixed player magnet dominates
      angle: 0,
      material: "metal",
      angularDamping: 8.0, // resist spin so dipole stays pointing right
      linearDamping: 0.4,
    }),
  );

  // ----- Bucket on the right -----
  const bucketCx = channelRight - 0.7;
  const bucketBaseY = 0;
  const wallH = channelHalfH * 2 - 0.1;
  const bucketHalfW = 0.5;
  const bucketWallT = 0.1;
  // Right wall of channel doubles as the bucket's right wall.
  world.add(
    box({
      position: { x: channelRight, y: channelHalfH },
      width: wallT,
      height: channelHalfH * 2,
      fixed: true,
      material: "wood",
    }),
  );
  // Inner left wall of bucket.
  world.add(
    box({
      position: { x: bucketCx - bucketHalfW, y: bucketBaseY + wallH / 2 },
      width: bucketWallT,
      height: wallH,
      fixed: true,
      material: "wood",
    }),
  );

  return {
    trackedBodies: { marble: puckId },
    goalZones: [
      {
        id: "bucket",
        label: "Bucket",
        center: { x: bucketCx, y: bucketBaseY + wallH / 2 },
        halfExtents: {
          x: bucketHalfW - bucketWallT / 2,
          y: wallH / 2,
        },
      },
    ],
  };
};

export const level22MagnetPush: Level = {
  id: "level22_magnetPush",
  title: "Level 22 — Magnet Push",
  goalText: "Same poles repel. Pick a magnet that pushes the puck rightward into the bucket.",
  setupScene,
  palette: {
    "magnet+": { count: 1, fixed: true },
    "magnet-": { count: 1, fixed: true },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -6, minY: -0.5, maxX: 6, maxY: 4 },
};
