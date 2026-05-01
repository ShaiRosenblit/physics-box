import type { World } from "../core/World";
import { box } from "../mechanics/box";
import { hinge } from "../mechanics/hinge";
import { lookupMaterial } from "../mechanics/materials";
import { addWorkshopEnclosure } from "./workshopEnclosure";

/**
 * Planar double pendulum: two uniform rigid bars connected by revolute joints
 * at the ceiling and at the elbow. Shell and links use zero friction/restitution
 * so contact with the workshop loses minimal energy to tangential slip or bounce.
 * Initial pose uses large swing angles and opposing spins for a high-energy start.
 */
export function doublePendulum(world: World): void {
  const interiorHeight = 18;
  addWorkshopEnclosure(world, {
    interiorHeight,
    fixtureFriction: 0,
    fixtureRestitution: 0,
  });

  const pivotY = interiorHeight / 2;
  const pivotX = 0;

  const L1 = 1.4;
  const L2 = 1.1;
  const width = 0.065;

  /** 10× nominal metal density — heavier rods feel more pendulum-like. */
  const density = lookupMaterial("metal").density * 10;

  /**
   * Large swing + spin: high initial potential from pose and extra kinetic
   * energy so motion engages the full room quickly.
   */
  const phi1 = 1.15;
  const phi2 = 1.45;
  /** rad/s, Planck CCW positive. */
  const spinUpper = 2.8;
  const spinLower = -3.6;

  const dir = (phi: number) => ({ x: Math.sin(phi), y: -Math.cos(phi) });
  const d1 = dir(phi1);
  const d2 = dir(phi2);

  /**
   * Box center at half-length down from pivot, angle = phi so local +Y
   * points back up toward the pivot (verified against Planck getWorldVector).
   */
  const c1 = { x: pivotX + (L1 / 2) * d1.x, y: pivotY + (L1 / 2) * d1.y };
  const elbow = { x: pivotX + L1 * d1.x, y: pivotY + L1 * d1.y };
  const c2 = { x: elbow.x + (L2 / 2) * d2.x, y: elbow.y + (L2 / 2) * d2.y };

  const upperId = world.add(
    box({
      position: c1,
      width,
      height: L1,
      angle: phi1,
      material: "metal",
      density,
      fixtureFriction: 0,
      fixtureRestitution: 0,
      linearDamping: 0,
      angularDamping: 0,
      angularVelocity: spinUpper,
    }),
  );

  const lowerId = world.add(
    box({
      position: c2,
      width,
      height: L2,
      angle: phi2,
      material: "metal",
      density,
      fixtureFriction: 0,
      fixtureRestitution: 0,
      linearDamping: 0,
      angularDamping: 0,
      angularVelocity: spinLower,
    }),
  );

  world.addConstraint(
    hinge({ bodyA: upperId, worldAnchor: { x: pivotX, y: pivotY } }),
  );
  world.addConstraint(
    hinge({ bodyA: upperId, bodyB: lowerId, worldAnchor: elbow }),
  );
}
