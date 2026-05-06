import { describe, expect, it } from "vitest";
import { ball, pressureSwitch, World } from "../index";
import type { SwitchView } from "../core/types";

function getSwitch(world: World, id: number): SwitchView {
  const v = world.snapshot().bodies.find((b) => b.id === id);
  if (!v || v.kind !== "switch") {
    throw new Error(`expected switch view for id ${id}`);
  }
  return v;
}

describe("pressureSwitch", () => {
  it("reports pressed=false when no body rests on it", () => {
    const world = new World();
    const id = world.add(
      pressureSwitch({ position: { x: 0, y: 0 }, width: 1, height: 0.1 }),
    );
    world.stepOnce();
    expect(getSwitch(world, id).pressed).toBe(false);
  });

  it("becomes pressed once a dynamic ball settles on it, and clears when the ball leaves", () => {
    const world = new World();
    const switchId = world.add(
      pressureSwitch({ position: { x: 0, y: 0 }, width: 2, height: 0.2 }),
    );
    const ballId = world.add(
      ball({ position: { x: 0, y: 0.6 }, radius: 0.15, material: "wood" }),
    );

    // Let it land.
    for (let i = 0; i < 240; i++) world.stepOnce();
    expect(getSwitch(world, switchId).pressed).toBe(true);

    // Yank the ball away (teleport to a faraway place).
    world.patchBody(ballId, { position: { x: 50, y: 50 } });
    for (let i = 0; i < 5; i++) world.stepOnce();
    expect(getSwitch(world, switchId).pressed).toBe(false);
  });

  it("ignores static bodies sitting on it", () => {
    const world = new World();
    const switchId = world.add(
      pressureSwitch({ position: { x: 0, y: 0 }, width: 1, height: 0.1 }),
    );
    // Another fixed body resting flush; should not press the plate.
    world.add(
      ball({ position: { x: 0, y: 0.16 }, radius: 0.05, fixed: true }),
    );
    for (let i = 0; i < 30; i++) world.stepOnce();
    expect(getSwitch(world, switchId).pressed).toBe(false);
  });
});
