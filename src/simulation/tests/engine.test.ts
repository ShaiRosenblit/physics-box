import { describe, expect, it } from "vitest";
import { World, defaultConfig, engine } from "..";

describe("engine motor torque", () => {
  it("spins the rotor, not the whole housing, when housing is fixed", () => {
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    world.add(
      engine({
        position: { x: 0, y: 0 },
        width: 0.55,
        height: 0.34,
        rotorRadius: 0.11,
        torque: 380,
        fixed: true,
        angularDamping: 0,
      }),
    );
    for (let i = 0; i < 80; i++) world.stepOnce();
    const snap = world.snapshot();
    const housing = snap.bodies.find((b) => b.kind === "engine")!;
    const rotor = snap.bodies.find((b) => b.kind === "engine_rotor")!;
    expect(housing.fixed).toBe(true);
    expect(Math.abs(housing.angularVelocity)).toBeLessThan(1e-6);
    expect(rotor.angularVelocity).toBeGreaterThan(0.08);
  });

  it("applies signed torque to the rotor", () => {
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    world.add(
      engine({
        position: { x: 0, y: 0 },
        width: 0.5,
        height: 0.3,
        rotorRadius: 0.1,
        torque: 400,
        fixed: true,
        angularDamping: 0,
      }),
    );
    for (let i = 0; i < 60; i++) world.stepOnce();
    const rotor = world.snapshot().bodies.find((b) => b.kind === "engine_rotor")!;
    expect(rotor.angularVelocity).toBeGreaterThan(0.05);

    const world2 = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    world2.add(
      engine({
        position: { x: 0, y: 0 },
        width: 0.5,
        height: 0.3,
        rotorRadius: 0.1,
        torque: -400,
        fixed: true,
        angularDamping: 0,
      }),
    );
    for (let i = 0; i < 60; i++) world2.stepOnce();
    const rotor2 = world2.snapshot().bodies.find((b) => b.kind === "engine_rotor")!;
    expect(rotor2.angularVelocity).toBeLessThan(-0.05);
  });

  it("does not drive when rotor is not dynamic (edge: zero torque skipped)", () => {
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    world.add(
      engine({
        position: { x: 0, y: 0 },
        width: 0.4,
        height: 0.25,
        rotorRadius: 0.09,
        torque: 0,
        fixed: true,
        angularDamping: 0,
      }),
    );
    for (let i = 0; i < 20; i++) world.stepOnce();
    const rotor = world.snapshot().bodies.find((b) => b.kind === "engine_rotor")!;
    expect(rotor.angularVelocity).toBe(0);
  });

  it("clamps patch torque via housing id", () => {
    const world = new World();
    const id = world.add(
      engine({
        position: { x: 0, y: 1 },
        width: 0.3,
        height: 0.2,
        rotorRadius: 0.07,
        torque: 10,
      }),
    );
    world.patchBody(id, { torque: defaultConfig.maxMotorTorque + 500 });
    const housing = world.snapshot().bodies.find((b) => b.id === id)!;
    expect(housing.kind).toBe("engine");
    if (housing.kind === "engine") {
      expect(housing.torque).toBe(defaultConfig.maxMotorTorque);
    }
  });

  it("patching the rotor id updates shared motor spec", () => {
    const world = new World();
    const hid = world.add(
      engine({
        position: { x: 0, y: 1 },
        width: 0.35,
        height: 0.22,
        rotorRadius: 0.08,
        torque: 50,
      }),
    );
    const rid = world.snapshot().bodies.find((b) => b.kind === "engine_rotor")!.id;
    world.patchBody(rid, { torque: 99 });
    const housing = world.snapshot().bodies.find((b) => b.id === hid)!;
    expect(housing.kind).toBe("engine");
    if (housing.kind === "engine") expect(housing.torque).toBe(99);
  });
});
