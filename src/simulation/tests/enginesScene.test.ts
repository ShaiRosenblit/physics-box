import { describe, expect, it } from "vitest";
import { World, defaultConfig, engines } from "..";

describe("engines demo scene", () => {
  it("every rotor settles in the 0.4–2.5 rev/s perceivable band", () => {
    const world = new World({ ...defaultConfig });
    engines(world);
    for (let i = 0; i < 720; i++) world.stepOnce();
    const snap = world.snapshot();
    const rotors = snap.bodies.filter((b) => b.kind === "engine_rotor");
    expect(rotors.length).toBe(5);
    for (const r of rotors) {
      const revPerSec = Math.abs(r.angularVelocity) / (2 * Math.PI);
      // Slow enough to read, fast enough to clearly see motion at 60 FPS.
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

  it("belt-driven discs in stations 2, 3, 5 actually rotate", () => {
    const world = new World({ ...defaultConfig });
    engines(world);
    for (let i = 0; i < 480; i++) world.stepOnce();
    const snap = world.snapshot();
    const spinningDiscs = snap.bodies.filter(
      (b) =>
        b.kind === "ball" &&
        b.material === "metal" &&
        Math.abs(b.angularVelocity) > 0.5,
    );
    expect(spinningDiscs.length).toBeGreaterThanOrEqual(3);
  });
});
