import { ball, box, rope, worldAnchor, bodyAnchor } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 15 — Charged Pendulum.
 *
 * A marble is held at the top of a tall narrow chute. Open the play
 * and gravity drops it straight down into the bucket directly below —
 * except a negatively-charged cork pendulum is hanging in the gap
 * between the chute exit and the bucket. The bob's resting position is
 * dead-centered in the fall column, so a clean drop knocks it
 * sideways and the marble caroms off the rim.
 *
 * The player has a single fixed positive charge. Placed off to one
 * side, it pulls the bob out of the fall column by static Coulomb
 * attraction — the bob settles a foot to one side, the column clears,
 * and the marble drops straight through into the bucket.
 *
 * This is the first puzzle that combines a pendulum with electrostatic
 * deflection — Level 13's (−) anchors only sat in equilibrium; here
 * one is yanked sideways out of the way.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // ── Drop chute at the top ────────────────────────────────────────────
  // Two short fixed walls form a narrow vertical chute. The marble sits
  // at the top of the chute and falls straight out the bottom when play
  // begins. Walls are short enough that the marble exits with mostly
  // gravitational velocity — no horizontal drift to worry about.
  const chuteX = 0;
  const chuteHalfW = 0.32;
  const chuteTopY = 7.4;
  const chuteBotY = 6.6;
  const chuteH = chuteTopY - chuteBotY;
  world.add(
    box({
      position: { x: chuteX - chuteHalfW, y: (chuteTopY + chuteBotY) / 2 },
      width: 0.12,
      height: chuteH,
      fixed: true,
      material: "wood",
    }),
  );
  world.add(
    box({
      position: { x: chuteX + chuteHalfW, y: (chuteTopY + chuteBotY) / 2 },
      width: 0.12,
      height: chuteH,
      fixed: true,
      material: "wood",
    }),
  );

  // Marble at the top of the chute.
  const marbleR = 0.18;
  const marbleId = world.add(
    ball({
      position: { x: chuteX, y: chuteTopY - marbleR },
      radius: marbleR,
      material: "metal",
      angularDamping: 0.04,
      linearDamping: 0.01,
    }),
  );

  // ── Pendulum bob in the fall column ─────────────────────────────────
  // A cork bob hangs from a fixed ceiling anchor by a rigid distance
  // link. Its resting position is dead-centered between the chute
  // exit and the bucket. The bob carries a (−) charge, so a placed
  // (+) charge to either side will pull it out of the column.
  //
  // High damping is essential: without it the bob will swing back into
  // the column on the rebound, and whether the marble passes during
  // the "open" or "closed" half-cycle becomes a coin flip. With strong
  // damping the bob settles at its deflected angle and stays there.
  const bobX = chuteX;
  const bobY = 4.0;
  const ceilingY = 9.5;
  const bobId = world.add(
    ball({
      position: { x: bobX, y: bobY },
      radius: 0.26,
      material: "cork",
      charge: -3,
      angularDamping: 1.0,
      linearDamping: 1.0,
    }),
  );
  world.addConstraint(
    rope({
      a: worldAnchor({ x: bobX, y: ceilingY }),
      b: bodyAnchor(bobId),
      length: ceilingY - bobY,
      segments: 0,
    }),
  );

  // ── Bucket directly below the bob's resting position ────────────────
  // Tall walls so a marble that has been deflected sideways by the bob
  // misses cleanly — distinguishes "won" from "almost".
  const bucketCx = chuteX;
  const bucketBaseY = 0;
  const wallH = 1.2;
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
    trackedBodies: { marble: marbleId, bob: bobId },
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

export const level15ChargedPendulum: Level = {
  id: "level15_chargedPendulum",
  title: "Level 15 — Charged Pendulum",
  goalText:
    "The bob blocks the drop. Pull it aside with a positive charge.",
  setupScene,
  palette: {
    "ball+": { count: 1, fixed: true },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -5, minY: -0.5, maxX: 5, maxY: 10 },
};
