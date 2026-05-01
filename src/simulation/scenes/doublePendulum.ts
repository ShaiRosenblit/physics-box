import type { World } from "../core/World";
import { ball } from "../mechanics/ball";
import { box } from "../mechanics/box";
import { hinge } from "../mechanics/hinge";
import { weld } from "../mechanics/weld";
import { lookupMaterial } from "../mechanics/materials";
import { addWorkshopEnclosure } from "./workshopEnclosure";

/**
 * Planar double pendulum: near-massless rigid links with lumped masses at the
 * distal end of each bar (elbow and lower tip). Balls are rigidly fused to
 * their rod ends via weld joints; only the ceiling pivot and the elbow are
 * revolutes. Frictionless, zero damping so motion is essentially conservative.
 */
export function doublePendulum(world: World): void {
  /** Inner clearance from floor (y = 0) to ceiling; tall enough for L1+L2 tip travel. */
  const interiorHeight = 18;
  addWorkshopEnclosure(world, { interiorHeight });

  const thickness = 0.065;
  const L1 = 1.38;
  const L2 = 1.08;
  /** Vertically centered: equal room for tip above and below the pivot. */
  const pivotY = interiorHeight / 2;
  const pivotX = 0;
  /** Swing angles from downward vertical toward +x (radians). */
  const phi1 = 0.14;
  const phi2 = 0.21;

  const dir = (phi: number) => ({
    x: Math.sin(phi),
    y: -Math.cos(phi),
  });
  const d1 = dir(phi1);
  const d2 = dir(phi2);

  /** Aligns local +Y (long axis) with "up" the rod toward the pivot. */
  const bodyAngle = (phi: number) => phi;

  const c1 = {
    x: pivotX + (L1 / 2) * d1.x,
    y: pivotY + (L1 / 2) * d1.y,
  };
  const joint = {
    x: pivotX + L1 * d1.x,
    y: pivotY + L1 * d1.y,
  };
  const c2 = {
    x: joint.x + (L2 / 2) * d2.x,
    y: joint.y + (L2 / 2) * d2.y,
  };
  const tip = {
    x: joint.x + L2 * d2.x,
    y: joint.y + L2 * d2.y,
  };

  /** ~0.1% of nominal metal areal density — rods are visual/spatial only. */
  const linkDensity = lookupMaterial("metal").density * 0.001;
  /** Most system mass in the bobs (kg/m²). */
  const bobDensity = lookupMaterial("metal").density * 28;
  const bobR1 = 0.11;
  const bobR2 = 0.125;
  const noFriction = {
    fixtureFriction: 0,
    linearDamping: 0,
    angularDamping: 0,
  };

  const upperId = world.add(
    box({
      position: c1,
      width: thickness,
      height: L1,
      angle: bodyAngle(phi1),
      material: "metal",
      density: linkDensity,
      ...noFriction,
    }),
  );

  const lowerId = world.add(
    box({
      position: c2,
      width: thickness,
      height: L2,
      angle: bodyAngle(phi2),
      material: "metal",
      density: linkDensity,
      ...noFriction,
    }),
  );

  const elbowBobId = world.add(
    ball({
      position: joint,
      radius: bobR1,
      material: "metal",
      density: bobDensity,
      ...noFriction,
    }),
  );

  const tipBobId = world.add(
    ball({
      position: tip,
      radius: bobR2,
      material: "metal",
      density: bobDensity,
      ...noFriction,
    }),
  );

  // Ceiling pivot — upper bar can rotate freely here
  world.addConstraint(
    hinge({ bodyA: upperId, worldAnchor: { x: pivotX, y: pivotY } }),
  );
  // Elbow pivot — lower bar swings freely relative to upper bar
  world.addConstraint(
    hinge({
      bodyA: upperId,
      bodyB: lowerId,
      worldAnchor: joint,
    }),
  );
  // Elbow bob rigidly fused to the bottom of the upper bar
  world.addConstraint(
    weld({
      bodyA: upperId,
      bodyB: elbowBobId,
      worldAnchor: joint,
    }),
  );
  // Tip bob rigidly fused to the bottom of the lower bar
  world.addConstraint(
    weld({
      bodyA: lowerId,
      bodyB: tipBobId,
      worldAnchor: tip,
    }),
  );
}
