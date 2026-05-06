import { describe, expect, it } from "vitest";
import { ball, fan, pressureSwitch, World } from "../index";
import { computeFanForces } from "../mechanics/fanForce";
import type { BallView } from "../core/types";

function findBall(world: World, id: number): BallView {
  const v = world.snapshot().bodies.find((b) => b.id === id);
  if (!v || v.kind !== "ball") throw new Error("expected ball view");
  return v;
}

describe("computeFanForces", () => {
  it("applies positive +x force on a body inside the cone", () => {
    const fans = [
      {
        id: 1 as never,
        position: { x: 0, y: 0 },
        angle: 0,
        range: 5,
        halfAngle: Math.PI / 4,
        force: 10,
      },
    ];
    const targets = [{ id: 2 as never, position: { x: 1, y: 0 } }];
    const out = computeFanForces(fans, targets);
    const f = out.get(2 as never)!;
    expect(f.x).toBeGreaterThan(0);
    expect(Math.abs(f.y)).toBeLessThan(1e-9);
  });

  it("applies no force outside the cone (behind the fan)", () => {
    const fans = [
      {
        id: 1 as never,
        position: { x: 0, y: 0 },
        angle: 0,
        range: 5,
        halfAngle: Math.PI / 4,
        force: 10,
      },
    ];
    const targets = [{ id: 2 as never, position: { x: -1, y: 0 } }];
    const out = computeFanForces(fans, targets);
    expect(out.has(2 as never)).toBe(false);
  });

  it("applies no force outside the cone (off-axis past halfAngle)", () => {
    const fans = [
      {
        id: 1 as never,
        position: { x: 0, y: 0 },
        angle: 0,
        range: 5,
        halfAngle: 0.2,
        force: 10,
      },
    ];
    const targets = [{ id: 2 as never, position: { x: 1, y: 1 } }];
    const out = computeFanForces(fans, targets);
    expect(out.has(2 as never)).toBe(false);
  });

  it("force fades to zero as target approaches range", () => {
    const fan = {
      id: 1 as never,
      position: { x: 0, y: 0 },
      angle: 0,
      range: 5,
      halfAngle: Math.PI / 4,
      force: 10,
    };
    const near = computeFanForces([fan], [
      { id: 2 as never, position: { x: 0.5, y: 0 } },
    ]).get(2 as never)!;
    const far = computeFanForces([fan], [
      { id: 3 as never, position: { x: 4.9, y: 0 } },
    ]).get(3 as never)!;
    expect(near.x).toBeGreaterThan(far.x);
    expect(far.x).toBeGreaterThan(0);
  });
});

describe("fan integration with World", () => {
  it("an active fan pushes a balloon along its axis", () => {
    const world = new World();
    world.setGravityEnabled(false);
    world.add(
      fan({
        position: { x: -1, y: 0 },
        width: 0.4,
        height: 0.4,
        range: 4,
        force: 5,
      }),
    );
    const ballId = world.add(
      ball({
        position: { x: 1, y: 0 },
        radius: 0.1,
        material: "wood",
      }),
    );
    const before = findBall(world, ballId).position.x;
    for (let i = 0; i < 60; i++) world.stepOnce();
    const after = findBall(world, ballId).position.x;
    expect(after).toBeGreaterThan(before);
  });

  it("a fan gated by a switch is disabled until pressed", () => {
    const world = new World();
    world.setGravityEnabled(false);
    const switchId = world.add(
      pressureSwitch({ position: { x: -5, y: 0 }, width: 1, height: 0.1 }),
    );
    world.add(
      fan({
        position: { x: -1, y: 0 },
        width: 0.4,
        height: 0.4,
        range: 4,
        force: 5,
        defaultEnabled: false,
        triggerBy: switchId,
      }),
    );
    const ballId = world.add(
      ball({
        position: { x: 1, y: 0 },
        radius: 0.1,
        material: "wood",
      }),
    );
    const before = findBall(world, ballId).position.x;
    for (let i = 0; i < 60; i++) world.stepOnce();
    const after = findBall(world, ballId).position.x;
    expect(Math.abs(after - before)).toBeLessThan(1e-3);
  });
});
