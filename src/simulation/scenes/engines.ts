import type { World } from "../core/World";
import { ball } from "../mechanics/ball";
import { box } from "../mechanics/box";
import { engine } from "../mechanics/engine";
import { belt } from "../mechanics/belt";
import { hinge } from "../mechanics/hinge";
import { rope } from "../mechanics/rope";
import { spring } from "../mechanics/spring";
import { worldAnchor, bodyAnchor } from "../mechanics/anchors";
import { addWorkshopEnclosure } from "./workshopEnclosure";

/**
 * Engines demo scene — two stations: windmill arm + belt-driven spring oscillator.
 *
 * Box2D caps angular velocity per step; torques and damping are tuned so
 * flywheels stay in a perceivable speed band (~0.5–2 rev/s) on a 60 Hz display.
 */
export function engines(world: World): void {
  addWorkshopEnclosure(world);

  // ── Center divider ───────────────────────────────────────────────────
  const dividerH = 4.0;
  world.add(
    box({
      position: { x: 1.5, y: dividerH / 2 },
      width: 0.12,
      height: dividerH,
      fixed: true,
      material: "metal",
    }),
  );

  // ──────────────────────────────────────────────────────────────────────
  // Windmill — engine belts a long arm hinged to a post; cork balls on the floor.
  // ──────────────────────────────────────────────────────────────────────
  const pivotX = -4.0;
  const pivotY = 2.85;
  const armHalfH = 0.10;

  const postId = world.add(
    box({
      position: { x: pivotX, y: pivotY / 2 },
      width: 0.14,
      height: pivotY,
      fixed: true,
      material: "metal",
    }),
  );

  const arm = world.add(
    box({
      position: { x: pivotX, y: pivotY },
      width: 4.0,
      height: armHalfH * 2,
      material: "wood",
      angularDamping: 0.6,
      linearDamping: 0,
    }),
  );
  world.addConstraint(
    hinge({
      bodyA: arm,
      bodyB: postId,
      worldAnchor: { x: pivotX, y: pivotY },
    }),
  );

  const engWindId = world.add(
    engine({
      position: { x: -6.8, y: 0.12 },
      width: 0.40,
      height: 0.24,
      rotorRadius: 0.09,
      torque: 1.2,
      fixed: true,
      angularDamping: 0.6,
    }),
  );
  let snap = world.snapshot();
  let engView = snap.bodies.find((b) => b.id === engWindId);
  const rotorWind = engView?.kind === "engine" ? engView.rotorId : null;
  if (rotorWind !== null) {
    world.addConstraint(belt({ driverRotorId: rotorWind, drivenBodyId: arm }));
  }

  const armBalls: Array<[number, number]> = [
    [pivotX + 2.4, 0.10],
    [pivotX + 2.7, 0.10],
    [pivotX - 2.4, 0.10],
    [pivotX - 2.7, 0.10],
  ];
  for (const [bx, by] of armBalls) {
    world.add(
      ball({
        position: { x: bx, y: by },
        radius: 0.10,
        material: "cork",
        angularDamping: 0.05,
        linearDamping: 0.02,
      }),
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // Belt-driven disc + rope + vertical spring — rotation tugs a suspended bob.
  // ──────────────────────────────────────────────────────────────────────
  const engSpringId = world.add(
    engine({
      position: { x: 6.8, y: 0.12 },
      width: 0.36,
      height: 0.22,
      rotorRadius: 0.09,
      torque: 0.040,
      fixed: true,
      angularDamping: 2.5,
    }),
  );
  snap = world.snapshot();
  engView = snap.bodies.find((b) => b.id === engSpringId);
  const rotorSpring = engView?.kind === "engine" ? engView.rotorId : null;

  const discX = 8.5;
  const discR = 0.18;
  const disc = world.add(
    ball({
      position: { x: discX, y: discR },
      radius: discR,
      material: "metal",
      angularDamping: 1.5,
      linearDamping: 0,
    }),
  );
  world.addConstraint(hinge({ bodyA: disc, worldAnchor: { x: discX, y: discR } }));
  if (rotorSpring !== null) {
    world.addConstraint(belt({ driverRotorId: rotorSpring, drivenBodyId: disc }));
  }

  const bobId = world.add(
    ball({
      position: { x: discX, y: 3.2 },
      radius: 0.18,
      material: "metal",
    }),
  );
  world.addConstraint(
    spring({
      a: worldAnchor({ x: discX, y: 5.8 }),
      b: bodyAnchor(bobId),
      restLength: 2.4,
      frequencyHz: 1.8,
      dampingRatio: 0.35,
    }),
  );

  world.addConstraint(
    rope({
      a: bodyAnchor(disc),
      b: bodyAnchor(bobId),
      length: 3.1,
      segments: 10,
      material: "wood",
    }),
  );
}
