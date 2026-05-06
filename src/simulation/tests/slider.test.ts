import { describe, expect, it } from "vitest";
import { ball, box, slider, World } from "../index";
import type { BallView, BoxView } from "../core/types";

function findBall(world: World, id: number): BallView {
  const v = world.snapshot().bodies.find((b) => b.id === id);
  if (!v || v.kind !== "ball") throw new Error("expected ball view");
  return v;
}

function findBox(world: World, id: number): BoxView {
  const v = world.snapshot().bodies.find((b) => b.id === id);
  if (!v || v.kind !== "box") throw new Error("expected box view");
  return v;
}

describe("slider", () => {
  it("constrains a ball to translate only along the slider axis", () => {
    const world = new World();
    world.setGravityEnabled(false);
    const ballId = world.add(
      ball({ position: { x: 0, y: 0 }, radius: 0.15, material: "wood" }),
    );
    world.addConstraint(
      slider({
        bodyA: ballId,
        worldAnchor: { x: 0, y: 0 },
        axis: { x: 1, y: 0 },
      }),
    );
    // Push the ball off-axis; the slider should cancel any y motion.
    world.add(
      ball({
        position: { x: 0, y: 0.5 },
        radius: 0.15,
        velocity: { x: 0, y: -10 },
      }),
    );
    for (let i = 0; i < 60; i++) world.stepOnce();
    const after = findBall(world, ballId);
    expect(Math.abs(after.position.y)).toBeLessThan(0.05);
  });

  it("respects translation limits", () => {
    const world = new World();
    world.setGravityEnabled(false);
    const boxId = world.add(
      box({
        position: { x: 0, y: 0 },
        width: 0.3,
        height: 0.3,
        material: "wood",
        velocity: { x: 5, y: 0 },
      }),
    );
    world.addConstraint(
      slider({
        bodyA: boxId,
        worldAnchor: { x: 0, y: 0 },
        axis: { x: 1, y: 0 },
        lowerLimit: -0.5,
        upperLimit: 0.5,
      }),
    );
    for (let i = 0; i < 240; i++) world.stepOnce();
    const after = findBox(world, boxId);
    expect(after.position.x).toBeLessThanOrEqual(0.55);
    expect(after.position.x).toBeGreaterThanOrEqual(-0.55);
  });
});
