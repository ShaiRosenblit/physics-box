import type { World } from "../core/World";
import { box } from "../mechanics/box";
import { hinge } from "../mechanics/hinge";
import { addWorkshopEnclosure } from "./workshopEnclosure";

/**
 * Planar double pendulum: two rigid links, revolute at the ceiling and between links.
 *
 * Initial pose is built geometrically so joint anchors match link endpoints;
 * small offset angles from vertical seed chaotic motion under gravity.
 */
export function doublePendulum(world: World): void {
  addWorkshopEnclosure(world);

  const pivotY = 11.15;
  const thickness = 0.065;
  const L1 = 1.38;
  const L2 = 1.08;
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
    x: (L1 / 2) * d1.x,
    y: pivotY + (L1 / 2) * d1.y,
  };
  const joint = {
    x: L1 * d1.x,
    y: pivotY + L1 * d1.y,
  };
  const c2 = {
    x: joint.x + (L2 / 2) * d2.x,
    y: joint.y + (L2 / 2) * d2.y,
  };

  const upperId = world.add(
    box({
      position: c1,
      width: thickness,
      height: L1,
      angle: bodyAngle(phi1),
      material: "metal",
      linearDamping: 0,
      angularDamping: 0.015,
    }),
  );

  const lowerId = world.add(
    box({
      position: c2,
      width: thickness,
      height: L2,
      angle: bodyAngle(phi2),
      material: "metal",
      linearDamping: 0,
      angularDamping: 0.015,
    }),
  );

  world.addConstraint(
    hinge({ bodyA: upperId, worldAnchor: { x: 0, y: pivotY } }),
  );
  world.addConstraint(
    hinge({
      bodyA: upperId,
      bodyB: lowerId,
      worldAnchor: joint,
    }),
  );
}
