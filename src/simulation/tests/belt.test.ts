import { describe, expect, it } from "vitest";
import {
  World,
  ball,
  belt,
  defaultConfig,
  engine,
  hinge,
} from "..";

describe("transmission belt (gear joint)", () => {
  it("couples engine flywheel rotation to a driven disc", () => {
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    const hid = world.add(
      engine({
        position: { x: 0, y: 0 },
        width: 0.42,
        height: 0.26,
        rotorRadius: 0.1,
        torque: 320,
        fixed: true,
        angularDamping: 0,
      }),
    );
    const housing = world.snapshot().bodies.find((b) => b.id === hid);
    const rotorId = housing?.kind === "engine" ? housing.rotorId : null;
    expect(rotorId).not.toBeNull();

    const disc = world.add(
      ball({
        position: { x: 0.58, y: 0 },
        radius: 0.12,
        material: "wood",
        angularDamping: 0,
        linearDamping: 0,
      }),
    );

    const cid = world.addConstraint(
      belt({ driverRotorId: rotorId!, drivenBodyId: disc }),
    );

    for (let i = 0; i < 160; i++) world.stepOnce();
    const snap = world.snapshot();
    const rotor = snap.bodies.find((b) => b.id === rotorId);
    const driven = snap.bodies.find((b) => b.id === disc);
    expect(rotor?.angularVelocity).toBeGreaterThan(0.06);
    expect(driven?.angularVelocity).toBeGreaterThan(0.02);
    expect(Math.sign(driven!.angularVelocity)).toBe(Math.sign(rotor!.angularVelocity));

    const view = snap.constraints.find((c) => c.id === cid);
    expect(view?.kind).toBe("belt");
    if (view?.kind === "belt") {
      expect(view.path.length).toBeGreaterThanOrEqual(2);
      expect(view.ratio).toBeLessThan(0);
    }
  });

  it("removes belt when the engine assembly is removed", () => {
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    const hid = world.add(
      engine({
        position: { x: 0, y: 0 },
        width: 0.35,
        height: 0.22,
        rotorRadius: 0.08,
        torque: 100,
        fixed: true,
      }),
    );
    const housing = world.snapshot().bodies.find((b) => b.id === hid);
    const rotorId = housing?.kind === "engine" ? housing.rotorId : null;
    const disc = world.add(
      ball({
        position: { x: 0.5, y: 0 },
        radius: 0.1,
        material: "wood",
      }),
    );
    world.addConstraint(belt({ driverRotorId: rotorId!, drivenBodyId: disc }));
    expect(world.snapshot().constraints.length).toBe(1);
    world.remove(hid);
    expect(world.snapshot().constraints.length).toBe(0);
  });

  it("couples even when the driven body has a pre-existing hinge to ground", () => {
    // Regression: Box2D's GearJoint reads its dynamic body via
    // `joint2.getBodyB()`. The hinge factory used to create its revolute
    // with the dynamic body on bodyA, so a belt that reused that revolute
    // ended up coupling the rotor to ground (which never rotates) and the
    // driven body sat motionless.
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    const hid = world.add(
      engine({
        position: { x: 0, y: 0 },
        width: 0.42,
        height: 0.26,
        rotorRadius: 0.1,
        torque: 5,
        fixed: true,
        angularDamping: 0,
      }),
    );
    const housing = world.snapshot().bodies.find((b) => b.id === hid);
    const rotorId = housing?.kind === "engine" ? housing.rotorId : null;

    const disc = world.add(
      ball({
        position: { x: 0.58, y: 0 },
        radius: 0.12,
        material: "wood",
        angularDamping: 0,
        linearDamping: 0,
      }),
    );
    world.addConstraint(hinge({ bodyA: disc, worldAnchor: { x: 0.58, y: 0 } }));
    world.addConstraint(belt({ driverRotorId: rotorId!, drivenBodyId: disc }));

    for (let i = 0; i < 240; i++) world.stepOnce();
    const snap = world.snapshot();
    const driven = snap.bodies.find((b) => b.id === disc);
    expect(Math.abs(driven?.angularVelocity ?? 0)).toBeGreaterThan(1);
  });

  it("removes belt when the driven body is removed", () => {
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    const hid = world.add(
      engine({
        position: { x: 0, y: 0 },
        width: 0.35,
        height: 0.22,
        rotorRadius: 0.08,
        torque: 50,
        fixed: true,
      }),
    );
    const housing = world.snapshot().bodies.find((b) => b.id === hid);
    const rotorId = housing?.kind === "engine" ? housing.rotorId : null;
    const disc = world.add(
      ball({
        position: { x: 0.5, y: 0 },
        radius: 0.1,
        material: "wood",
      }),
    );
    world.addConstraint(belt({ driverRotorId: rotorId!, drivenBodyId: disc }));
    expect(world.snapshot().constraints.length).toBe(1);
    world.remove(disc);
    expect(world.snapshot().constraints.length).toBe(0);
  });
});
