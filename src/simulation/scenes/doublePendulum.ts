import type { World } from "../core/World";
import { box } from "../mechanics/box";
import { hinge } from "../mechanics/hinge";
import { lookupMaterial } from "../mechanics/materials";
import { addWorkshopEnclosure } from "./workshopEnclosure";

/**
 * Planar double pendulum: two uniform rigid bars connected by revolute joints
 * at the ceiling and at the elbow. Shell and links use zero friction/restitution
 * so contact with the workshop loses minimal energy to tangential slip or bounce.
 * Initial pose uses a folded elbow plus matched linear + angular velocity so
 * each rod moves coherently with its hinge (no huge solver shock at t = 0).
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
   * Bent chain: ϕ₁ and ϕ₂ are both from vertical toward +x for the *rod axis*
   * direction; choosing opposite signs yields a clear elbow instead of one long
   * near-straight line. Large spins add kinetic energy on top of the raised pose.
   */
  const phi1 = 1.38;
  const phi2 = -0.72;
  /**
   * rad/s, Planck CCW positive. Magnitudes chosen so total mechanical energy
   * readily supports full rotations over the room height.
   */
  const spinUpper = 14;
  const spinLower = -16.5;

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

  /**
   * Linear velocity consistent with rigid rotation about each hinge at t = 0:
   * upper COM about ceiling, lower COM = elbow velocity + spin about elbow.
   * v = ω × r in 2D ⇒ v_x = −ω r_y, v_y = ω r_x (r from hinge to point).
   */
  const rU = { x: c1.x - pivotX, y: c1.y - pivotY };
  const velUpper = {
    x: -spinUpper * rU.y,
    y: spinUpper * rU.x,
  };
  const rElbowFromPivot = { x: elbow.x - pivotX, y: elbow.y - pivotY };
  const velElbow = {
    x: -spinUpper * rElbowFromPivot.y,
    y: spinUpper * rElbowFromPivot.x,
  };
  const rLowerFromElbow = { x: c2.x - elbow.x, y: c2.y - elbow.y };
  const velLower = {
    x: velElbow.x - spinLower * rLowerFromElbow.y,
    y: velElbow.y + spinLower * rLowerFromElbow.x,
  };

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
      velocity: velUpper,
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
      velocity: velLower,
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
