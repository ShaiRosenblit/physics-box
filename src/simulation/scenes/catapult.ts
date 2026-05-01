import type { World } from "../core/World";
import { ball } from "../mechanics/ball";
import { box } from "../mechanics/box";
import { hinge } from "../mechanics/hinge";
import { spring } from "../mechanics/spring";
import { worldAnchor, bodyAnchor } from "../mechanics/anchors";
import { addWorkshopEnclosure } from "./workshopEnclosure";

/**
 * Spring-arm catapult — hinged throwing beam, traction spring, and a cork shot.
 *
 * The arm starts cocked; the spring pulls the short lever forward so the long
 * bucket arc swings through and launches the projectile across open floor.
 */
export function catapult(world: World): void {
  addWorkshopEnclosure(world);

  const pivot = { x: 0.55, y: 0.38 };
  const armW = 2.85;
  const armH = 0.13;
  /** CCW from +x: bucket low on +x, spring horn pulled back toward −x. */
  const armAngleRad = (40 * Math.PI) / 180;

  const cos = Math.cos(armAngleRad);
  const sin = Math.sin(armAngleRad);
  const armCx = pivot.x + (armW / 2) * cos;
  const armCy = pivot.y + (armW / 2) * sin;

  world.add(
    box({
      position: { x: -0.35, y: 0.075 },
      width: 2.6,
      height: 0.15,
      fixed: true,
      material: "wood",
    }),
  );

  const postId = world.add(
    box({
      position: { x: pivot.x, y: pivot.y / 2 },
      width: 0.14,
      height: pivot.y,
      fixed: true,
      material: "wood",
    }),
  );

  const armId = world.add(
    box({
      position: { x: armCx, y: armCy },
      width: armW,
      height: armH,
      angle: armAngleRad,
      material: "wood",
      angularDamping: 0.08,
      linearDamping: 0.02,
    }),
  );

  world.addConstraint(
    hinge({
      bodyA: armId,
      bodyB: postId,
      worldAnchor: pivot,
    }),
  );

  /** Anchor sits behind the frame so the spring is taut while cocked. */
  const springAnchor = { x: -0.72, y: 0.26 };
  world.addConstraint(
    spring({
      a: worldAnchor(springAnchor),
      b: bodyAnchor(armId, { x: -armW / 2, y: 0 }),
      restLength: 0.72,
      frequencyHz: 8,
      dampingRatio: 0.22,
    }),
  );

  const tip = {
    x: pivot.x + armW * cos,
    y: pivot.y + armW * sin,
  };
  const shotR = 0.11;
  const perch = armH / 2 + shotR + 0.012;
  const shotPos = {
    x: tip.x - sin * perch,
    y: tip.y + cos * perch,
  };

  world.add(
    ball({
      position: shotPos,
      radius: shotR,
      material: "cork",
      angularDamping: 0.05,
      linearDamping: 0.015,
    }),
  );
}
