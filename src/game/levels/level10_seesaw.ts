import { ball, box, hinge, weld } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 10 — Seesaw.
 *
 * A wooden plank is balanced on a pivot post. A light cork marble sits
 * cradled between two short walls welded to the right end of the plank.
 * The bucket sits on a tall pedestal directly above the launch point.
 * The player drops a heavy box on the left end — the left side sinks,
 * the right side rises, and the marble is flung upward into the bucket.
 *
 * The cradle walls are essential: without them the marble simply slides
 * down the tilting plank toward the pivot and never gains enough
 * vertical velocity to reach the bucket.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // Pivot post.
  const pivotX = 0;
  const pivotY = 2.5;
  const postId = world.add(
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

  // Hinge the plank to the post (not just to the world). With a
  // world-anchor-only hinge, the plank body and the post body still
  // collide every frame at their geometric overlap, which steals
  // angular impulse from the seesaw flip.
  world.addConstraint(
    hinge({
      bodyA: plankId,
      bodyB: postId,
      worldAnchor: { x: pivotX, y: pivotY },
    }),
  );

  // Cork marble on the right end of the plank.
  const marbleX = pivotX + plankW / 2 - 0.4;
  const marbleR = 0.16;
  const marbleY = pivotY + plankH / 2 + marbleR;
  const marbleId = world.add(
    ball({
      position: { x: marbleX, y: marbleY },
      radius: marbleR,
      material: "cork",
      angularDamping: 0.06,
      linearDamping: 0.01,
    }),
  );

  // Cradle walls welded to the plank, on either side of the marble. As
  // the plank tilts up these stay attached and rotate with it, so the
  // marble gets carried by the plank instead of sliding toward the
  // pivot. Walls are barely taller than the marble so they don't pin it.
  const cradleWallH = 0.30;
  const cradleWallT = 0.08;
  const cradleWallY = pivotY + plankH / 2 + cradleWallH / 2;
  const cradleLeftX = marbleX - marbleR - cradleWallT / 2 - 0.01;
  const cradleRightX = marbleX + marbleR + cradleWallT / 2 + 0.01;
  const cradleLeftId = world.add(
    box({
      position: { x: cradleLeftX, y: cradleWallY },
      width: cradleWallT,
      height: cradleWallH,
      material: "wood",
    }),
  );
  world.addConstraint(
    weld({
      bodyA: plankId,
      bodyB: cradleLeftId,
      worldAnchor: { x: cradleLeftX, y: cradleWallY },
    }),
  );
  const cradleRightId = world.add(
    box({
      position: { x: cradleRightX, y: cradleWallY },
      width: cradleWallT,
      height: cradleWallH,
      material: "wood",
    }),
  );
  world.addConstraint(
    weld({
      bodyA: plankId,
      bodyB: cradleRightId,
      worldAnchor: { x: cradleRightX, y: cradleWallY },
    }),
  );

  // Bucket on a tall pedestal directly above the launch point. Lowered
  // from y=7.5 to y=4 so the height is realistic for the cradle-launch
  // velocity, and the pedestal makes the bucket look anchored instead
  // of hanging in mid-air with no visible support.
  const bucketCx = marbleX;
  const bucketBaseY = 4;
  const wallH = 0.9;
  const bucketHalfW = 0.55;
  const wallT = 0.12;

  // Pedestal: a thin pillar from the floor up to the bucket's base.
  // Offset slightly to the right of the bucket center so the marble's
  // upward path from the cradle is unobstructed.
  const pedestalX = bucketCx + bucketHalfW + 0.25;
  world.add(
    box({
      position: { x: pedestalX, y: bucketBaseY / 2 },
      width: 0.1,
      height: bucketBaseY,
      fixed: true,
      material: "wood",
    }),
  );
  // Horizontal bracket from the pedestal to the bucket's right wall —
  // sells the "bucket sits on this support" read.
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
