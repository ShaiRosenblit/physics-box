import { describe, expect, it } from "vitest";
import {
  ball,
  computeCoulombForces,
  emConstants,
  sampleE,
  World,
  type ChargedBodyState,
  type Id,
} from "../index";
import { defaultConfig } from "../core/config";

const ec = emConstants(defaultConfig);

const id = (n: number) => n as unknown as Id;

function make(idNum: number, x: number, y: number, q: number): ChargedBodyState {
  return { id: id(idNum), position: { x, y }, charge: q };
}

describe("Coulomb force", () => {
  it("like charges repel: forces point apart, equal magnitude", () => {
    const a = make(1, 0, 0, 1);
    const b = make(2, 1, 0, 1);
    const f = computeCoulombForces([a, b], ec);
    const fa = f.get(id(1))!;
    const fb = f.get(id(2))!;

    expect(fa.x).toBeLessThan(0);
    expect(fb.x).toBeGreaterThan(0);
    expect(fa.x).toBeCloseTo(-fb.x, 10);
    expect(fa.y).toBeCloseTo(0, 10);
    expect(fb.y).toBeCloseTo(0, 10);
  });

  it("opposite charges attract", () => {
    const a = make(1, 0, 0, 1);
    const b = make(2, 1, 0, -1);
    const f = computeCoulombForces([a, b], ec);

    expect(f.get(id(1))!.x).toBeGreaterThan(0);
    expect(f.get(id(2))!.x).toBeLessThan(0);
  });

  it("Newton's third law: net force on the system is zero", () => {
    const states = [
      make(1, 0, 0, 1),
      make(2, 2, 0, -2),
      make(3, 1, 1.5, 0.5),
    ];
    const f = computeCoulombForces(states, ec);
    let nx = 0;
    let ny = 0;
    for (const v of f.values()) {
      nx += v.x;
      ny += v.y;
    }
    expect(nx).toBeCloseTo(0, 8);
    expect(ny).toBeCloseTo(0, 8);
  });

  it("softening prevents singularity at zero distance", () => {
    const a = make(1, 0, 0, 1);
    const b = make(2, 0, 0, 1);
    const f = computeCoulombForces([a, b], ec);
    const fa = f.get(id(1))!;
    expect(Number.isFinite(fa.x)).toBe(true);
    expect(Number.isFinite(fa.y)).toBe(true);
  });

  it("magnitude is clamped to maxEmForce", () => {
    const big = ec.maxEmForce * 100;
    const states = [make(1, 0, 0, big), make(2, 0.01, 0, big)];
    const f = computeCoulombForces(states, ec);
    const fa = f.get(id(1))!;
    const m = Math.hypot(fa.x, fa.y);
    expect(m).toBeLessThanOrEqual(ec.maxEmForce + 1e-6);
  });

  it("is deterministic: same inputs produce the same forces", () => {
    const states = [
      make(1, 0, 0, 1),
      make(2, 0.4, -0.3, -1),
      make(3, -0.7, 0.2, 0.5),
    ];
    const f1 = computeCoulombForces(states, ec);
    const f2 = computeCoulombForces(states, ec);
    for (const id of f1.keys()) {
      expect(f1.get(id)!.x).toBe(f2.get(id)!.x);
      expect(f1.get(id)!.y).toBe(f2.get(id)!.y);
    }
  });
});

describe("sampleE", () => {
  it("returns zero with no charges", () => {
    const e = sampleE({ x: 1, y: 2 }, [], ec);
    expect(e.x).toBe(0);
    expect(e.y).toBe(0);
  });

  it("points away from a positive charge", () => {
    const e = sampleE({ x: 1, y: 0 }, [make(1, 0, 0, 1)], ec);
    expect(e.x).toBeGreaterThan(0);
    expect(e.y).toBeCloseTo(0, 10);
  });

  it("points toward a negative charge", () => {
    const e = sampleE({ x: 1, y: 0 }, [make(1, 0, 0, -1)], ec);
    expect(e.x).toBeLessThan(0);
  });
});

describe("World with charged bodies", () => {
  it("two like charges drift apart over time", () => {
    const w = new World();
    const a = w.add(ball({ position: { x: -0.5, y: 5 }, radius: 0.1, charge: 5 }));
    const b = w.add(ball({ position: { x: 0.5, y: 5 }, radius: 0.1, charge: 5 }));
    const before = w.snapshot();
    for (let i = 0; i < 60; i++) w.stepOnce();
    const after = w.snapshot();
    const ax0 = (before.bodies.find((x) => x.id === a)! as any).position.x;
    const bx0 = (before.bodies.find((x) => x.id === b)! as any).position.x;
    const ax1 = (after.bodies.find((x) => x.id === a)! as any).position.x;
    const bx1 = (after.bodies.find((x) => x.id === b)! as any).position.x;
    expect(bx1 - ax1).toBeGreaterThan(bx0 - ax0);
  });

  it("two opposite charges drift toward each other", () => {
    const w = new World();
    const a = w.add(ball({ position: { x: -0.5, y: 5 }, radius: 0.1, charge: 5 }));
    const b = w.add(ball({ position: { x: 0.5, y: 5 }, radius: 0.1, charge: -5 }));
    const before = w.snapshot();
    for (let i = 0; i < 60; i++) w.stepOnce();
    const after = w.snapshot();
    const ax0 = (before.bodies.find((x) => x.id === a)! as any).position.x;
    const bx0 = (before.bodies.find((x) => x.id === b)! as any).position.x;
    const ax1 = (after.bodies.find((x) => x.id === a)! as any).position.x;
    const bx1 = (after.bodies.find((x) => x.id === b)! as any).position.x;
    expect(bx1 - ax1).toBeLessThan(bx0 - ax0);
  });

  it("sampleField returns zero when no charged bodies exist", () => {
    const w = new World();
    w.add(ball({ position: { x: 0, y: 5 }, radius: 0.1 }));
    const f = w.sampleField({ x: 1, y: 1 });
    expect(f.E.x).toBe(0);
    expect(f.E.y).toBe(0);
  });
});
