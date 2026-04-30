import { describe, expect, it } from "vitest";
import {
  computeLorentzForces,
  computeMagnetPairForces,
  defaultConfig,
  emConstants,
  magnet,
  sampleB,
  sampleGradB,
  World,
  type ChargedBodyState,
  type Id,
  type MagneticBodyState,
  type Vec2,
} from "../index";

const ec = emConstants(defaultConfig);
const id = (n: number) => n as unknown as Id;

function mag(idNum: number, x: number, y: number, m: number): MagneticBodyState {
  return { id: id(idNum), position: { x, y }, dipole: m };
}

function chg(
  idNum: number,
  x: number,
  y: number,
  q: number,
  v: Vec2,
): ChargedBodyState & { velocity: Vec2 } {
  return { id: id(idNum), position: { x, y }, charge: q, velocity: v };
}

describe("sampleB", () => {
  it("zero with no magnets", () => {
    expect(sampleB({ x: 1, y: 1 }, [], ec)).toBe(0);
  });

  it("sign matches dipole sign", () => {
    const pos = sampleB({ x: 1, y: 0 }, [mag(1, 0, 0, 5)], ec);
    const neg = sampleB({ x: 1, y: 0 }, [mag(1, 0, 0, -5)], ec);
    expect(pos).toBeGreaterThan(0);
    expect(neg).toBeLessThan(0);
  });

  it("falls off with distance", () => {
    const close = sampleB({ x: 0.5, y: 0 }, [mag(1, 0, 0, 1)], ec);
    const far = sampleB({ x: 5, y: 0 }, [mag(1, 0, 0, 1)], ec);
    expect(Math.abs(close)).toBeGreaterThan(Math.abs(far));
  });

  it("sampleGradB points toward the source for a positive monopole", () => {
    const g = sampleGradB({ x: 1, y: 0 }, [mag(1, 0, 0, 1)], ec);
    expect(g.x).toBeLessThan(0);
    expect(g.y).toBeCloseTo(0, 10);
  });
});

describe("Lorentz force", () => {
  it("zero with no magnets", () => {
    const f = computeLorentzForces([chg(1, 0, 0, 1, { x: 1, y: 0 })], [], ec);
    expect(f.size).toBe(0);
  });

  it("perpendicular to velocity", () => {
    const charges = [chg(1, 1, 0, 1, { x: 1, y: 0 })];
    const magnets = [mag(2, 0, 0, 5)];
    const f = computeLorentzForces(charges, magnets, ec);
    const fa = f.get(id(1))!;
    const dot = fa.x * 1 + fa.y * 0;
    expect(Math.abs(dot)).toBeLessThan(1e-9);
    expect(Math.abs(fa.y)).toBeGreaterThan(0);
  });

  it("flips sign with charge sign", () => {
    const magnets = [mag(2, 0, 0, 5)];
    const f1 = computeLorentzForces(
      [chg(1, 1, 0, 1, { x: 1, y: 0 })],
      magnets,
      ec,
    );
    const f2 = computeLorentzForces(
      [chg(1, 1, 0, -1, { x: 1, y: 0 })],
      magnets,
      ec,
    );
    expect(f1.get(id(1))!.y).toBeCloseTo(-f2.get(id(1))!.y, 10);
  });

  it("magnitude clamped to maxEmForce", () => {
    const charges = [chg(1, 0.01, 0, 1e6, { x: 1, y: 0 })];
    const magnets = [mag(2, 0, 0, 1e6)];
    const f = computeLorentzForces(charges, magnets, ec);
    const fa = f.get(id(1))!;
    expect(Math.hypot(fa.x, fa.y)).toBeLessThanOrEqual(ec.maxEmForce + 1e-6);
  });
});

describe("magnet pair forces", () => {
  it("like-sign monopoles repel", () => {
    const f = computeMagnetPairForces(
      [mag(1, 0, 0, 1), mag(2, 1, 0, 1)],
      ec,
    );
    expect(f.get(id(1))!.x).toBeLessThan(0);
    expect(f.get(id(2))!.x).toBeGreaterThan(0);
  });

  it("opposite-sign monopoles attract", () => {
    const f = computeMagnetPairForces(
      [mag(1, 0, 0, 1), mag(2, 1, 0, -1)],
      ec,
    );
    expect(f.get(id(1))!.x).toBeGreaterThan(0);
    expect(f.get(id(2))!.x).toBeLessThan(0);
  });

  it("Newton's third law on pair", () => {
    const f = computeMagnetPairForces(
      [mag(1, 0, 0, 2), mag(2, 1, 0.5, 3)],
      ec,
    );
    const a = f.get(id(1))!;
    const b = f.get(id(2))!;
    expect(a.x + b.x).toBeCloseTo(0, 10);
    expect(a.y + b.y).toBeCloseTo(0, 10);
  });
});

describe("World with magnet bodies", () => {
  it("two like-sign magnets drift apart", () => {
    const w = new World();
    const a = w.add(magnet({ position: { x: -0.6, y: 5 }, radius: 0.2, dipole: 8 }));
    const b = w.add(magnet({ position: { x: 0.6, y: 5 }, radius: 0.2, dipole: 8 }));
    const before = w.snapshot();
    for (let i = 0; i < 60; i++) w.stepOnce();
    const after = w.snapshot();
    const ax0 = before.bodies.find((x) => x.id === a)!.position.x;
    const bx0 = before.bodies.find((x) => x.id === b)!.position.x;
    const ax1 = after.bodies.find((x) => x.id === a)!.position.x;
    const bx1 = after.bodies.find((x) => x.id === b)!.position.x;
    expect(bx1 - ax1).toBeGreaterThan(bx0 - ax0);
  });

  it("sampleField returns B from magnets", () => {
    const w = new World();
    w.add(magnet({ position: { x: 0, y: 5 }, radius: 0.2, dipole: 5 }));
    const f = w.sampleField({ x: 1, y: 5 });
    expect(f.B).toBeGreaterThan(0);
    expect(f.E.x).toBe(0);
    expect(f.E.y).toBe(0);
  });
});
