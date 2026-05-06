import { describe, expect, it } from "vitest";
import {
  ball,
  bar,
  bodyAnchor,
  rope,
  spring,
  weld,
  worldAnchor,
  World,
} from "../index";

describe("breakable joints", () => {
  it("a rope without breakForce holds a heavy load indefinitely", () => {
    const world = new World();
    const ballId = world.add(
      ball({ position: { x: 0, y: -1 }, radius: 0.1, material: "metal" }),
    );
    const ropeId = world.addConstraint(
      rope({
        a: worldAnchor({ x: 0, y: 0 }),
        b: bodyAnchor(ballId),
        length: 1,
        segments: 0,
      }),
    );
    for (let i = 0; i < 240; i++) world.stepOnce();
    const constraints = world.snapshot().constraints;
    expect(constraints.find((c) => c.id === ropeId)).toBeDefined();
  });

  it("a rope with low breakForce snaps under gravity load and emits joint_break", () => {
    const world = new World();
    const ballId = world.add(
      ball({ position: { x: 0, y: -1 }, radius: 0.15, material: "metal" }),
    );
    const ropeId = world.addConstraint(
      rope({
        a: worldAnchor({ x: 0, y: 0 }),
        b: bodyAnchor(ballId),
        length: 1,
        segments: 0,
        breakForce: 0.1,
      }),
    );
    let breakSeen: { id: number; force: number } | null = null;
    world.on("joint_break", (e) => {
      if (e.id === ropeId) breakSeen = { id: e.id, force: e.force };
    });
    for (let i = 0; i < 60; i++) world.stepOnce();
    expect(breakSeen).not.toBeNull();
    const constraints = world.snapshot().constraints;
    expect(constraints.find((c) => c.id === ropeId)).toBeUndefined();
  });

  it("a bar with sufficient breakForce holds; with a low one snaps", () => {
    const make = (breakForce?: number) => {
      const world = new World();
      const a = world.add(
        ball({ position: { x: -0.5, y: -1 }, radius: 0.1, material: "metal" }),
      );
      const b = world.add(
        ball({ position: { x: 0.5, y: -1 }, radius: 0.1, material: "metal" }),
      );
      const id = world.addConstraint(
        bar({
          a: bodyAnchor(a),
          b: bodyAnchor(b),
          length: 1,
          ...(breakForce !== undefined ? { breakForce } : {}),
        }),
      );
      // Anchor each end so the bar carries axial load.
      world.addConstraint(
        rope({
          a: worldAnchor({ x: -2, y: -1 }),
          b: bodyAnchor(a),
          length: 1.5,
          segments: 0,
        }),
      );
      world.addConstraint(
        rope({
          a: worldAnchor({ x: 2, y: -1 }),
          b: bodyAnchor(b),
          length: 1.5,
          segments: 0,
        }),
      );
      for (let i = 0; i < 240; i++) world.stepOnce();
      return world.snapshot().constraints.find((c) => c.id === id);
    };
    expect(make(undefined)).toBeDefined();
    expect(make(0.05)).toBeUndefined();
  });

  it("spring and weld also support breakForce", () => {
    // Spring under stretch.
    const w1 = new World();
    const a = w1.add(ball({ position: { x: 0, y: 0 }, radius: 0.1, fixed: true }));
    const b = w1.add(
      ball({ position: { x: 0, y: -1 }, radius: 0.1, material: "metal" }),
    );
    const sid = w1.addConstraint(
      spring({
        a: bodyAnchor(a),
        b: bodyAnchor(b),
        restLength: 0.05,
        frequencyHz: 6,
        dampingRatio: 0.1,
        breakForce: 0.05,
      }),
    );
    for (let i = 0; i < 240; i++) w1.stepOnce();
    expect(w1.snapshot().constraints.find((c) => c.id === sid)).toBeUndefined();

    // Weld between two heavy balls hanging from a single rope.
    const w2 = new World();
    const top = w2.add(ball({ position: { x: 0, y: 0 }, radius: 0.1, fixed: true }));
    const left = w2.add(
      ball({ position: { x: -0.05, y: -1 }, radius: 0.1, material: "metal" }),
    );
    const right = w2.add(
      ball({ position: { x: 0.05, y: -1 }, radius: 0.1, material: "metal" }),
    );
    w2.addConstraint(
      rope({
        a: bodyAnchor(top),
        b: bodyAnchor(left),
        length: 1.0,
        segments: 0,
      }),
    );
    const wid = w2.addConstraint(
      weld({
        bodyA: left,
        bodyB: right,
        worldAnchor: { x: 0, y: -1 },
        breakForce: 0.05,
      }),
    );
    for (let i = 0; i < 240; i++) w2.stepOnce();
    expect(w2.snapshot().constraints.find((c) => c.id === wid)).toBeUndefined();
  });
});
