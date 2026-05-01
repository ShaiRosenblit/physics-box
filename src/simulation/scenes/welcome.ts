import type { World } from "../core/World";
import { ball } from "../mechanics/ball";
import { balloon } from "../mechanics/balloon";
import { box } from "../mechanics/box";
import { engine } from "../mechanics/engine";
import { magnet } from "../mechanics/magnet";
import { belt } from "../mechanics/belt";
import { crank } from "../mechanics/crank";
import { rope } from "../mechanics/rope";
import { pulley } from "../mechanics/pulley";
import { hinge } from "../mechanics/hinge";
import { spring } from "../mechanics/spring";
import { bodyAnchor, worldAnchor } from "../mechanics/anchors";
import { addWorkshopEnclosure } from "./workshopEnclosure";

/**
 * Welcome scene — v3 (M6).
 *
 * Adds two suspended charged balls (one positive, one negative) so
 * the E-field streamlines have something to draw from on first run.
 * Both are anchored by stiff springs so they hover at rest height
 * and don't drift across the workshop while the user reads the UI.
 */
export function welcome(world: World): void {
  addWorkshopEnclosure(world);

  const crateSize = 0.7;
  for (let i = 0; i < 3; i++) {
    world.add(
      box({
        position: { x: -3.2, y: crateSize / 2 + i * crateSize },
        width: crateSize,
        height: crateSize,
        material: "wood",
      }),
    );
  }

  world.add(
    box({
      position: { x: 7.0, y: 0.45 },
      width: 0.9,
      height: 0.9,
      material: "wood",
    }),
  );

  world.add(
    ball({ position: { x: -1.1, y: 4.6 }, radius: 0.5, material: "metal" }),
  );
  world.add(
    ball({ position: { x: 1.0, y: 3.4 }, radius: 0.4, material: "wood" }),
  );
  world.add(
    ball({ position: { x: 2.6, y: 4.2 }, radius: 0.32, material: "cork" }),
  );

  world.add(
    balloon({
      position: { x: 5.2, y: 5.4 },
      radius: 0.28,
      buoyancyLift: 0.42,
      linearDamping: 1.2,
    }),
  );

  world.add(
    engine({
      position: { x: -3.8, y: 0.14 },
      width: 0.38,
      height: 0.24,
      rotorRadius: 0.09,
      rpm: 240,
      maxTorque: 600,
      angularDamping: 0.12,
    }),
  );

  const beltDriveHousing = world.add(
    engine({
      position: { x: 2.25, y: 0.22 },
      width: 0.34,
      height: 0.2,
      rotorRadius: 0.075,
      rpm: 180,
      maxTorque: 400,
      fixed: true,
      angularDamping: 0.1,
    }),
  );
  const beltSnap = world.snapshot();
  const beltHousing = beltSnap.bodies.find((b) => b.id === beltDriveHousing);
  const beltRotorId =
    beltHousing?.kind === "engine" ? beltHousing.rotorId : null;
  const beltWheel = world.add(
    crank({
      position: { x: 3.55, y: 0.22 },
      radius: 0.11,
      pinRadius: 0.072,
      material: "wood",
      linearDamping: 0.05,
      angularDamping: 0.2,
    }),
  );
  world.addConstraint(
    hinge({ bodyA: beltWheel, worldAnchor: { x: 3.55, y: 0.22 } }),
  );
  if (beltRotorId !== null) {
    world.addConstraint(
      belt({ driverRotorId: beltRotorId, drivenBodyId: beltWheel }),
    );
  }
  const beltPull = world.add(
    ball({
      position: { x: 3.55, y: 0.95 },
      radius: 0.09,
      material: "cork",
      linearDamping: 0.08,
    }),
  );
  world.addConstraint(
    rope({
      a: bodyAnchor(beltWheel, { x: 0.072, y: 0 }),
      b: bodyAnchor(beltPull),
      length: 0.58,
      segments: 6,
      material: "wood",
    }),
  );

  const ropeBob = world.add(
    ball({
      position: { x: -5.5, y: 4.0 },
      radius: 0.3,
      material: "wood",
      velocity: { x: 0.7, y: 0 },
    }),
  );
  world.addConstraint(
    rope({
      a: worldAnchor({ x: -5.5, y: 6.5 }),
      b: bodyAnchor(ropeBob),
      length: 2.6,
      segments: 14,
      material: "wood",
    }),
  );

  const pulleyA = world.add(
    ball({
      position: { x: -10.8, y: 3.9 },
      radius: 0.26,
      material: "metal",
    }),
  );
  const pulleyB = world.add(
    ball({
      position: { x: -9.6, y: 3.9 },
      radius: 0.26,
      material: "wood",
    }),
  );
  world.addConstraint(
    pulley({
      wheelCenter: { x: -10.2, y: 5.65 },
      bodyA: pulleyA,
      bodyB: pulleyB,
      localAnchorA: { x: 0, y: 0.26 },
      localAnchorB: { x: 0, y: 0.26 },
    }),
  );

  const springBob = world.add(
    ball({
      position: { x: 0.5, y: 5.5 },
      radius: 0.32,
      material: "metal",
    }),
  );
  world.addConstraint(
    spring({
      a: worldAnchor({ x: 0.5, y: 7.0 }),
      b: bodyAnchor(springBob),
      restLength: 1.0,
      frequencyHz: 2.5,
      dampingRatio: 0.4,
    }),
  );

  world.add(
    box({
      position: { x: 5.0, y: 0.5 },
      width: 0.3,
      height: 1.0,
      fixed: true,
      material: "metal",
    }),
  );
  const plank = world.add(
    box({
      position: { x: 5.0, y: 1.15 },
      width: 2.6,
      // Thick enough to survive "fit whole workshop" zoom (~few px if 0.15 m).
      height: 0.4,
      material: "wood",
    }),
  );
  world.addConstraint(
    hinge({ bodyA: plank, worldAnchor: { x: 5.0, y: 1.15 } }),
  );
  world.add(
    box({
      position: { x: 4.0, y: 1.7 },
      width: 0.3,
      height: 0.3,
      material: "metal",
    }),
  );

  const posCharge = world.add(
    ball({
      position: { x: -8.5, y: 4.5 },
      radius: 0.32,
      material: "metal",
      charge: 6,
    }),
  );
  world.addConstraint(
    spring({
      a: worldAnchor({ x: -8.5, y: 6.5 }),
      b: bodyAnchor(posCharge),
      restLength: 2.0,
      frequencyHz: 3,
      dampingRatio: 0.9,
    }),
  );

  const negCharge = world.add(
    ball({
      position: { x: 8.5, y: 4.5 },
      radius: 0.32,
      material: "metal",
      charge: -6,
    }),
  );
  world.addConstraint(
    spring({
      a: worldAnchor({ x: 8.5, y: 6.5 }),
      b: bodyAnchor(negCharge),
      restLength: 2.0,
      frequencyHz: 3,
      dampingRatio: 0.9,
    }),
  );

  const magN = world.add(
    magnet({ position: { x: -2.0, y: 7.5 }, radius: 0.32, dipole: 10 }),
  );
  world.addConstraint(
    spring({
      a: worldAnchor({ x: -2.0, y: 9.0 }),
      b: bodyAnchor(magN),
      restLength: 1.5,
      frequencyHz: 3,
      dampingRatio: 0.95,
    }),
  );

  const magS = world.add(
    magnet({ position: { x: 2.0, y: 7.5 }, radius: 0.32, dipole: -10 }),
  );
  world.addConstraint(
    spring({
      a: worldAnchor({ x: 2.0, y: 9.0 }),
      b: bodyAnchor(magS),
      restLength: 1.5,
      frequencyHz: 3,
      dampingRatio: 0.95,
    }),
  );
}
