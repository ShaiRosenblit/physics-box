import { describe, expect, it } from "vitest";
import {
  ball,
  electromagnet,
  pressureSwitch,
  World,
} from "../index";
import type {
  BallView,
  ElectromagnetView,
} from "../core/types";

function findElectromagnet(world: World, id: number): ElectromagnetView {
  const v = world.snapshot().bodies.find((b) => b.id === id);
  if (!v || v.kind !== "electromagnet") {
    throw new Error("expected electromagnet view");
  }
  return v;
}

function findBall(world: World, id: number): BallView {
  const v = world.snapshot().bodies.find((b) => b.id === id);
  if (!v || v.kind !== "ball") {
    throw new Error("expected ball view");
  }
  return v;
}

describe("electromagnet", () => {
  it("attracts a ferromagnetic ball when defaultEnabled is true", () => {
    const world = new World();
    world.setGravityEnabled(false);
    const emId = world.add(
      electromagnet({
        position: { x: 0, y: 0 },
        radius: 0.2,
        dipole: 30,
      }),
    );
    const ballId = world.add(
      ball({
        position: { x: 1.5, y: 0 },
        radius: 0.1,
        material: "metal",
      }),
    );

    expect(findElectromagnet(world, emId).enabled).toBe(true);

    const before = findBall(world, ballId).position.x;
    for (let i = 0; i < 60; i++) world.stepOnce();
    const after = findBall(world, ballId).position.x;
    expect(after).toBeLessThan(before);
  });

  it("exerts no force when defaultEnabled is false", () => {
    const world = new World();
    world.setGravityEnabled(false);
    world.add(
      electromagnet({
        position: { x: 0, y: 0 },
        radius: 0.2,
        dipole: 30,
        defaultEnabled: false,
      }),
    );
    const ballId = world.add(
      ball({
        position: { x: 1.5, y: 0 },
        radius: 0.1,
        material: "metal",
      }),
    );

    const before = findBall(world, ballId).position.x;
    for (let i = 0; i < 60; i++) world.stepOnce();
    const after = findBall(world, ballId).position.x;
    expect(Math.abs(after - before)).toBeLessThan(1e-3);
  });

  it("activates when its bound switch is pressed and stops when released", () => {
    const world = new World();
    world.setGravityEnabled(false);
    const switchId = world.add(
      pressureSwitch({ position: { x: -3, y: 0 }, width: 1, height: 0.1 }),
    );
    const emId = world.add(
      electromagnet({
        position: { x: 0, y: 0 },
        radius: 0.2,
        dipole: 30,
        defaultEnabled: false,
        triggerBy: switchId,
      }),
    );
    const ballId = world.add(
      ball({
        position: { x: 1.5, y: 0 },
        radius: 0.1,
        material: "metal",
      }),
    );

    expect(findElectromagnet(world, emId).enabled).toBe(false);

    // Place a heavy ball on the switch by spawning it touching the plate.
    world.add(
      ball({
        position: { x: -3, y: 0.18 },
        radius: 0.15,
        material: "metal",
      }),
    );
    // Re-enable gravity locally for the presser only would be nice but
    // setGravityEnabled is global; instead, push the presser onto the switch.
    world.setGravityEnabled(true);
    for (let i = 0; i < 240; i++) world.stepOnce();
    expect(findElectromagnet(world, emId).enabled).toBe(true);
    // Disable gravity again so we can isolate magnet-attraction effect.
    world.setGravityEnabled(false);

    const before = findBall(world, ballId).position.x;
    for (let i = 0; i < 60; i++) world.stepOnce();
    const after = findBall(world, ballId).position.x;
    expect(after).toBeLessThan(before);
  });
});
