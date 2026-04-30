import { describe, expect, it } from "vitest";
import { World, defaultConfig, engines } from "..";

describe("engines demo scene", () => {
  it("both engine rotors settle in the perceivable speed band", () => {
    const world = new World({ ...defaultConfig });
    engines(world);
    for (let i = 0; i < 720; i++) world.stepOnce();
    const snap = world.snapshot();
    const rotors = snap.bodies.filter((b) => b.kind === "engine_rotor");
    expect(rotors.length).toBe(2);
    for (const r of rotors) {
      const revPerSec = Math.abs(r.angularVelocity) / (2 * Math.PI);
      expect(revPerSec).toBeGreaterThan(0.4);
      expect(revPerSec).toBeLessThan(2.0);
    }
  });

  it("windmill arm sweeps multiple full revolutions over time", () => {
    const world = new World({ ...defaultConfig });
    engines(world);
    for (let i = 0; i < 240; i++) world.stepOnce();
    const start = world.snapshot();
    const arm = start.bodies.find(
      (b) => b.kind === "box" && b.width === 4.0 && b.height === 0.2,
    );
    expect(arm).toBeTruthy();
    if (!arm) return;
    const a0 = arm.angle;
    for (let i = 0; i < 480; i++) world.stepOnce();
    const arm2 = world.snapshot().bodies.find((b) => b.id === arm.id);
    expect(arm2).toBeTruthy();
    if (!arm2) return;
    const sweptRad = Math.abs(arm2.angle - a0);
    expect(sweptRad).toBeGreaterThan(2 * Math.PI);
  });

  it("belt-driven disc for the spring station rotates", () => {
    const world = new World({ ...defaultConfig });
    engines(world);
    for (let i = 0; i < 480; i++) world.stepOnce();
    const snap = world.snapshot();
    const disc = snap.bodies.find(
      (b) =>
        b.kind === "ball" &&
        b.material === "metal" &&
        Math.abs(b.position.x - 8.5) < 0.01 &&
        Math.abs(b.radius - 0.18) < 0.01,
    );
    expect(disc).toBeTruthy();
    if (!disc) return;
    expect(Math.abs(disc.angularVelocity)).toBeGreaterThan(0.5);
  });
});
