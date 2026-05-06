import { ball, box, rope, worldAnchor, bodyAnchor } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 90 — Tripwire.
 *
 * Showcases the **breakable joint** primitive (rope with a force
 * threshold). A heavy steel marble dangles from a thin rope whose
 * `breakForce` is tuned to sit just above the marble's static weight,
 * so on its own it dangles indefinitely. The bucket sits directly
 * beneath the marble — it has to *drop* in.
 *
 * The player drops one extra ball from above. The added impact and
 * persistent extra weight push the rope's tension past the threshold;
 * the rope snaps and the marble plunges into the bucket.
 *
 * Numbered out of sequence (90) to leave the 15–24 range available
 * for the project's planned puzzle progression.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // 0.22-radius metal marble has area π(0.22)² ≈ 0.152 m² with
  // density 7.8, mass ≈ 1.19 kg, weight ≈ 11.7 N at g = 9.81.
  // breakForce 16 holds the marble alone but snaps under any extra
  // load.
  const ceilingY = 6;
  const marbleY = 4;
  const marble = world.add(
    ball({
      position: { x: 0, y: marbleY },
      radius: 0.22,
      material: "metal",
      angularDamping: 0.05,
      linearDamping: 0.02,
    }),
  );
  world.addConstraint(
    rope({
      a: worldAnchor({ x: 0, y: ceilingY }),
      b: bodyAnchor(marble),
      length: ceilingY - marbleY,
      segments: 0,
      breakForce: 16,
    }),
  );

  // Bucket directly below the marble.
  const bucketCx = 0;
  const wallH = 1.0;
  const bucketHalfW = 0.7;
  const wallT = 0.12;
  world.add(
    box({
      position: { x: bucketCx - bucketHalfW, y: wallH / 2 },
      width: wallT,
      height: wallH,
      fixed: true,
      material: "wood",
    }),
  );
  world.add(
    box({
      position: { x: bucketCx + bucketHalfW, y: wallH / 2 },
      width: wallT,
      height: wallH,
      fixed: true,
      material: "wood",
    }),
  );

  return {
    trackedBodies: { marble },
    goalZones: [
      {
        id: "bucket",
        label: "Bucket",
        center: { x: bucketCx, y: wallH / 2 },
        halfExtents: { x: bucketHalfW - wallT / 2, y: wallH / 2 },
      },
    ],
  };
};

export const level90Tripwire: Level = {
  id: "level90_tripwire",
  title: "Level 90 — Tripwire",
  goalText: "Drop something on the marble to overload the rope.",
  setupScene,
  palette: {
    ball: { count: 1 },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -4, minY: -0.5, maxX: 4, maxY: 7 },
};
