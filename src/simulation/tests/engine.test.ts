import { describe, expect, it } from "vitest";
import { World, defaultConfig, engine } from "..";

function ωFromRpm(rpm: number): number {
  return (rpm * Math.PI) / 30;
}

describe("engine revolute joint motor", () => {
  it("spins the rotor, not the housing, when housing is fixed", () => {
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    world.add(
      engine({
        position: { x: 0, y: 0 },
        width: 0.55,
        height: 0.34,
        rotorRadius: 0.11,
        rpm: 240,
        maxTorque: 800,
        fixed: true,
        angularDamping: 0,
      }),
    );
    for (let i = 0; i < 200; i++) world.stepOnce();
    const snap = world.snapshot();
    const housing = snap.bodies.find((b) => b.kind === "engine")!;
    const rotor = snap.bodies.find((b) => b.kind === "engine_rotor")!;
    expect(housing.fixed).toBe(true);
    expect(Math.abs(housing.angularVelocity)).toBeLessThan(1e-5);
    const target = ωFromRpm(240);
    expect(Math.abs(rotor.angularVelocity - target)).toBeLessThan(target * 0.15);
  });

  it("applies signed rpm to the rotor motor", () => {
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    world.add(
      engine({
        position: { x: 0, y: 0 },
        width: 0.5,
        height: 0.3,
        rotorRadius: 0.1,
        rpm: 300,
        maxTorque: 900,
        fixed: true,
        angularDamping: 0,
      }),
    );
    for (let i = 0; i < 160; i++) world.stepOnce();
    let rotor = world.snapshot().bodies.find((b) => b.kind === "engine_rotor")!;
    expect(rotor.angularVelocity).toBeGreaterThan(ωFromRpm(300) * 0.7);

    const world2 = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    world2.add(
      engine({
        position: { x: 0, y: 0 },
        width: 0.5,
        height: 0.3,
        rotorRadius: 0.1,
        rpm: -300,
        maxTorque: 900,
        fixed: true,
        angularDamping: 0,
      }),
    );
    for (let i = 0; i < 160; i++) world2.stepOnce();
    rotor = world2.snapshot().bodies.find((b) => b.kind === "engine_rotor")!;
    expect(rotor.angularVelocity).toBeLessThan(-ωFromRpm(300) * 0.7);
  });

  it("rpm zero keeps rotor near rest", () => {
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    world.add(
      engine({
        position: { x: 0, y: 0 },
        width: 0.4,
        height: 0.25,
        rotorRadius: 0.09,
        rpm: 0,
        maxTorque: 400,
        fixed: true,
        angularDamping: 0,
      }),
    );
    for (let i = 0; i < 40; i++) world.stepOnce();
    const rotor = world.snapshot().bodies.find((b) => b.kind === "engine_rotor")!;
    expect(Math.abs(rotor.angularVelocity)).toBeLessThan(0.02);
  });

  it("clamps patch maxTorque via housing id", () => {
    const world = new World();
    const id = world.add(
      engine({
        position: { x: 0, y: 1 },
        width: 0.3,
        height: 0.2,
        rotorRadius: 0.07,
        rpm: 60,
        maxTorque: 10,
      }),
    );
    world.patchBody(id, {
      maxTorque: defaultConfig.maxMotorTorque + 500,
    });
    const housing = world.snapshot().bodies.find((b) => b.id === id)!;
    expect(housing.kind).toBe("engine");
    if (housing.kind === "engine") {
      expect(housing.maxTorque).toBe(defaultConfig.maxMotorTorque);
    }
  });

  it("clamps patch rpm via housing id", () => {
    const world = new World();
    const id = world.add(
      engine({
        position: { x: 0, y: 1 },
        width: 0.3,
        height: 0.2,
        rotorRadius: 0.07,
        rpm: 60,
        maxTorque: 50,
      }),
    );
    world.patchBody(id, { rpm: defaultConfig.maxRpm + 999 });
    const housing = world.snapshot().bodies.find((b) => b.id === id)!;
    expect(housing.kind).toBe("engine");
    if (housing.kind === "engine") {
      expect(housing.rpm).toBe(defaultConfig.maxRpm);
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
        rpm: 120,
        maxTorque: 50,
      }),
    );
    const rid = world.snapshot().bodies.find((b) => b.kind === "engine_rotor")!.id;
    world.patchBody(rid, { rpm: 99 });
    const housing = world.snapshot().bodies.find((b) => b.id === hid)!;
    expect(housing.kind).toBe("engine");
    if (housing.kind === "engine") expect(housing.rpm).toBe(99);
  });
});
