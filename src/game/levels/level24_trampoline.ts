import { ball, box, spring, worldAnchor, bodyAnchor } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 24 — Trampoline.
 *
 * A wooden plank floats on two vertical springs anchored to the floor.
 * A marble drops onto it from a chute directly above. With both springs
 * relaxed equally, the plank is level and the marble bounces straight
 * up, missing the off-center bucket. The player drops a single weight
 * box onto one side of the plank — the loaded spring compresses more,
 * the plank tilts, and the marble's bounce now leaves at an angle that
 * lands it in the bucket on the high shelf.
 *
 * The first level that uses a spring as a continuously-active *bounce
 * surface* rather than as a preloaded launcher (cf. L12 Catapult).
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // ----- Trampoline plank held by two vertical springs -----
  const plankCx = 0;
  const plankRestY = 1.4;
  const plankW = 2.2;
  const plankH = 0.16;
  const plankId = world.add(
    box({
      position: { x: plankCx, y: plankRestY },
      width: plankW,
      height: plankH,
      material: "wood",
      // Some angular damping so a tilted plank settles to a steady angle
      // before the marble arrives; without this it would oscillate.
      angularDamping: 0.8,
      linearDamping: 0.05,
    }),
  );

  const springSpread = 0.85;
  const restLength = plankRestY - plankH / 2;
  for (const dx of [-springSpread, +springSpread]) {
    world.addConstraint(
      spring({
        a: worldAnchor({ x: plankCx + dx, y: 0 }),
        b: bodyAnchor(plankId, { x: dx, y: -plankH / 2 }),
        restLength,
        frequencyHz: 3.5,
        dampingRatio: 0.22,
      }),
    );
  }

  // Visual posts at the spring anchors — sells the springs as mounted
  // mechanisms rather than dangling lines.
  for (const dx of [-springSpread, +springSpread]) {
    world.add(
      box({
        position: { x: plankCx + dx, y: 0.15 },
        width: 0.18,
        height: 0.3,
        fixed: true,
        material: "wood",
      }),
    );
  }

  // ----- Marble + chute mouth above the trampoline -----
  const chuteY = 6.0;
  const marbleR = 0.16;
  const marbleId = world.add(
    ball({
      position: { x: plankCx, y: chuteY },
      radius: marbleR,
      material: "metal",
      fixtureRestitution: 0.45,
      angularDamping: 0.05,
      linearDamping: 0.01,
    }),
  );

  // Funnel walls just below the chute mouth so the marble drops cleanly.
  const funnelY = 5.2;
  for (const dx of [-0.32, +0.32]) {
    world.add(
      box({
        position: { x: plankCx + dx, y: funnelY },
        width: 0.1,
        height: 0.5,
        fixed: true,
        material: "wood",
      }),
    );
  }

  // ----- Bucket on a high shelf to the right -----
  const bucketCx = 4.0;
  const bucketBaseY = 3.0;
  const bucketWallH = 0.9;
  const bucketHalfW = 0.7;
  const bucketWallT = 0.12;

  // Pedestal on the right of the bucket so the bucket reads as supported
  // and the marble's incoming arc has a clear left-side approach.
  const pedestalX = bucketCx + bucketHalfW + 0.18;
  world.add(
    box({
      position: { x: pedestalX, y: bucketBaseY / 2 },
      width: 0.14,
      height: bucketBaseY,
      fixed: true,
      material: "wood",
    }),
  );
  world.add(
    box({
      position: { x: pedestalX - 0.13, y: bucketBaseY - 0.05 },
      width: 0.34,
      height: 0.08,
      fixed: true,
      material: "wood",
    }),
  );
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

export const level24Trampoline: Level = {
  id: "level24_trampoline",
  title: "Level 24 — Trampoline",
  goalText: "Tilt the trampoline with a counterweight so the marble bounces sideways into the bucket.",
  setupScene,
  palette: {
    box: { count: 1 },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -6, minY: -0.5, maxX: 7, maxY: 8 },
};
