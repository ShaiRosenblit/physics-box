import { describe, expect, it } from "vitest";
import { World, defaultConfig, engine } from "..";

describe("engine motor torque", () => {
  it("applies signed torque so angular velocity follows sign", () => {
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    world.add(
      engine({
        position: { x: 0, y: 0 },
        width: 0.5,
        height: 0.3,
        torque: 400,
        angularDamping: 0,
      }),
    );
    for (let i = 0; i < 60; i++) world.stepOnce();
    const wPlus = world.snapshot().bodies[0]!;
    expect(wPlus.kind).toBe("engine");
    expect(wPlus.angularVelocity).toBeGreaterThan(0.05);

    const world2 = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    world2.add(
      engine({
        position: { x: 0, y: 0 },
        width: 0.5,
        height: 0.3,
        torque: -400,
        angularDamping: 0,
      }),
    );
    for (let i = 0; i < 60; i++) world2.stepOnce();
    const wNeg = world2.snapshot().bodies[0]!;
    expect(wNeg.angularVelocity).toBeLessThan(-0.05);
  });

  it("does not drive fixed engines", () => {
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    world.add(
      engine({
        position: { x: 0, y: 0 },
        width: 0.4,
        height: 0.25,
        torque: 800,
        fixed: true,
        angularDamping: 0,
      }),
    );
    for (let i = 0; i < 40; i++) world.stepOnce();
    const b = world.snapshot().bodies[0]!;
    expect(b.angularVelocity).toBe(0);
  });

  it("clamps patch torque to maxMotorTorque", () => {
    const world = new World();
    const id = world.add(
      engine({
        position: { x: 0, y: 1 },
        width: 0.3,
        height: 0.2,
        torque: 10,
      }),
    );
    world.patchBody(id, { torque: defaultConfig.maxMotorTorque + 500 });
    const v = world.snapshot().bodies.find((b) => b.id === id)!;
    expect(v.kind).toBe("engine");
    if (v.kind === "engine") expect(v.torque).toBe(defaultConfig.maxMotorTorque);
  });
});
