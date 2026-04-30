import type { World } from "../core/World";
import { ball } from "../mechanics/ball";
import { box } from "../mechanics/box";
import { rope } from "../mechanics/rope";
import { hinge } from "../mechanics/hinge";
import { spring } from "../mechanics/spring";
import { bodyAnchor, worldAnchor } from "../mechanics/anchors";

/**
 * Welcome scene — v2 (M5).
 *
 * v1's wide ground, crate stack, settled balls, and right-side box,
 * plus three new fixtures so first run shows off constraints:
 *   - a hanging rope with a wooden bob, given a small initial swing
 *   - a vertical spring with a metal weight, displaced from rest
 *   - a hinged seesaw with a metal weight tipping the left end
 *
 * Composition is feature-driven; M8 will redesign with intent.
 */
export function welcome(world: World): void {
  const groundHeight = 0.5;
  world.add(
    box({
      position: { x: 0, y: -groundHeight / 2 },
      width: 40,
      height: groundHeight,
      fixed: true,
      material: "wood",
    }),
  );

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
      height: 0.15,
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
}
