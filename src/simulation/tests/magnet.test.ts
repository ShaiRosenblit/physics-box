import { describe, expect, it } from "vitest";
import {
  ball,
  computeFerromagneticForces,
  computeMagnetPairForces,
  computeMagnetPairTorques,
  defaultConfig,
  emConstants,
  magnet,
  sampleB,
  sampleGradB,
  World,
  type FerromagneticBodyState,
  type Id,
  type MagneticBodyState,
} from "../index";

const ec = emConstants(defaultConfig);
const id = (n: number) => n as unknown as Id;

function mag(
  idNum: number,
  x: number,
  y: number,
  m: number,
  angle = 0,
): MagneticBodyState {
  return { id: id(idNum), position: { x, y }, dipole: m, angle };
}

function ferro(idNum: number, x: number, y: number, area = 0.05): FerromagneticBodyState {
  return { id: id(idNum), position: { x, y }, area };
}

describe("sampleB (in-plane dipole + ε-regularized Bz)", () => {
  it("zero with no magnets", () => {
    expect(sampleB({ x: 1, y: 1 }, [], ec)).toBe(0);
  });

  it("sign follows dipole and heading on axis", () => {
    const pos = sampleB({ x: 1, y: 0 }, [mag(1, 0, 0, 5, 0)], ec);
    const neg = sampleB({ x: 1, y: 0 }, [mag(1, 0, 0, -5, 0)], ec);
    expect(pos).toBeGreaterThan(0);
    expect(neg).toBeLessThan(0);
  });

  it("flips when moment is rotated 180°", () => {
    const a = sampleB({ x: 1, y: 0 }, [mag(1, 0, 0, 5, 0)], ec);
    const b = sampleB({ x: 1, y: 0 }, [mag(1, 0, 0, 5, Math.PI)], ec);
    expect(a).toBeCloseTo(-b, 10);
  });

  it("falls off with distance", () => {
    const close = sampleB({ x: 0.5, y: 0 }, [mag(1, 0, 0, 1, 0)], ec);
    const far = sampleB({ x: 5, y: 0 }, [mag(1, 0, 0, 1, 0)], ec);
    expect(Math.abs(close)).toBeGreaterThan(Math.abs(far));
  });

  it("sampleGradB is finite off sources", () => {
    const g = sampleGradB({ x: 1, y: 0.3 }, [mag(1, 0, 0, 1, 0)], ec);
    expect(Number.isFinite(g.x)).toBe(true);
    expect(Number.isFinite(g.y)).toBe(true);
    expect(Math.hypot(g.x, g.y)).toBeGreaterThan(0);
  });
});

describe("ferromagnetic attraction", () => {
  it("zero with no magnets", () => {
    const f = computeFerromagneticForces([ferro(1, 0, 0)], [], ec);
    expect(f.size).toBe(0);
  });

  it("zero with no ferromagnetic bodies", () => {
    const f = computeFerromagneticForces([], [mag(1, 0, 0, 5)], ec);
    expect(f.size).toBe(0);
  });

  it("pulls toward magnet regardless of pole sign", () => {
    const ferros = [ferro(1, -1, 0)];
    const fPos = computeFerromagneticForces(ferros, [mag(2, 0, 0, 5, 0)], ec);
    const fNeg = computeFerromagneticForces(ferros, [mag(2, 0, 0, -5, 0)], ec);
    const a = fPos.get(id(1))!;
    const b = fNeg.get(id(1))!;
    // both point toward the magnet (+x direction from x=-1)
    expect(a.x).toBeGreaterThan(0);
    expect(b.x).toBeGreaterThan(0);
    // and have the same magnitude — sign of dipole does not matter
    expect(a.x).toBeCloseTo(b.x, 10);
    expect(a.y).toBeCloseTo(b.y, 10);
  });

  it("falls off with distance", () => {
    const m = [mag(2, 0, 0, 5, 0)];
    const close = computeFerromagneticForces([ferro(1, -0.5, 0)], m, ec).get(id(1))!;
    const far = computeFerromagneticForces([ferro(1, -5, 0)], m, ec).get(id(1))!;
    expect(Math.hypot(close.x, close.y)).toBeGreaterThan(
      Math.hypot(far.x, far.y),
    );
  });

  it("multiple magnets combine as a vector sum", () => {
    const ferros = [ferro(1, 0, 0)];
    const m1 = [mag(2, 1, 0.3, 5, 0)];
    const m2 = [mag(3, -0.7, 1.2, 4, 0)];
    const m12 = [mag(2, 1, 0.3, 5, 0), mag(3, -0.7, 1.2, 4, 0)];
    const f1 = computeFerromagneticForces(ferros, m1, ec).get(id(1))!;
    const f2 = computeFerromagneticForces(ferros, m2, ec).get(id(1))!;
    const f12 = computeFerromagneticForces(ferros, m12, ec).get(id(1))!;
    expect(f12.x).toBeCloseTo(f1.x + f2.x, 10);
    expect(f12.y).toBeCloseTo(f1.y + f2.y, 10);
  });

  it("scales with magnet strength and ferro area", () => {
    const m = [mag(2, 0, 0, 5, 0)];
    const m2x = [mag(2, 0, 0, 10, 0)];
    const fA = computeFerromagneticForces([ferro(1, -1, 0, 0.05)], m, ec).get(id(1))!;
    const fStronger = computeFerromagneticForces([ferro(1, -1, 0, 0.05)], m2x, ec).get(id(1))!;
    const fBigger = computeFerromagneticForces([ferro(1, -1, 0, 0.1)], m, ec).get(id(1))!;
    expect(Math.hypot(fStronger.x, fStronger.y)).toBeCloseTo(2 * Math.hypot(fA.x, fA.y), 10);
    expect(Math.hypot(fBigger.x, fBigger.y)).toBeCloseTo(2 * Math.hypot(fA.x, fA.y), 10);
  });

  it("magnitude clamped to maxEmForce", () => {
    const f = computeFerromagneticForces(
      [ferro(1, 0.01, 0, 1)],
      [mag(2, 0, 0, 1e6, 0)],
      ec,
    ).get(id(1))!;
    expect(Math.hypot(f.x, f.y)).toBeLessThanOrEqual(ec.maxEmForce + 1e-6);
  });
});

describe("magnet pair forces (dipole–dipole)", () => {
  it("side-by-side parallel moments repel along the line of centers", () => {
    const f = computeMagnetPairForces(
      [mag(1, 0, 0, 2, Math.PI / 2), mag(2, 1, 0, 2, Math.PI / 2)],
      ec,
    );
    expect(f.get(id(2))!.x).toBeGreaterThan(0);
    expect(f.get(id(1))!.x).toBeLessThan(0);
  });

  it("Newton's third law on pair", () => {
    const f = computeMagnetPairForces(
      [mag(1, 0, 0, 2, 0.2), mag(2, 1, 0.5, 3, -0.4)],
      ec,
    );
    const a = f.get(id(1))!;
    const b = f.get(id(2))!;
    expect(a.x + b.x).toBeCloseTo(0, 10);
    expect(a.y + b.y).toBeCloseTo(0, 10);
  });
});

describe("magnet pair torques", () => {
  it("non-zero when a peer dipole is offset", () => {
    const t = computeMagnetPairTorques(
      [mag(1, 0, 0, 4, 0), mag(2, 1.2, 0.3, 3, Math.PI / 4)],
      ec,
    );
    expect(Math.abs(t.get(id(1)) ?? 0)).toBeGreaterThan(1e-9);
    expect(Math.abs(t.get(id(2)) ?? 0)).toBeGreaterThan(1e-9);
  });

  it("torque magnitude clamped to maxEmTorque", () => {
    const t = computeMagnetPairTorques(
      [mag(1, 0, 0, 1e8, 0), mag(2, 0.02, 0, 1e8, Math.PI / 2)],
      ec,
    );
    for (const [, tau] of t) {
      expect(Math.abs(tau)).toBeLessThanOrEqual(ec.maxEmTorque + 1e-6);
    }
  });
});

describe("World with magnet bodies", () => {
  it("two parallel dipoles side-by-side drift apart", () => {
    const w = new World();
    const a = w.add(
      magnet({
        position: { x: -0.6, y: 5 },
        radius: 0.2,
        dipole: 8,
        angle: Math.PI / 2,
      }),
    );
    const b = w.add(
      magnet({
        position: { x: 0.6, y: 5 },
        radius: 0.2,
        dipole: 8,
        angle: Math.PI / 2,
      }),
    );
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

  it("metal ball is pulled toward a magnet (gravity disabled)", () => {
    const w = new World();
    w.setGravityEnabled(false);
    const m = w.add(magnet({ position: { x: 0, y: 0 }, radius: 0.2, dipole: 20, fixed: true }));
    const b = w.add(ball({ position: { x: 1.5, y: 0 }, radius: 0.1, material: "metal" }));
    const before = w.snapshot().bodies.find((x) => x.id === b)!.position.x;
    for (let i = 0; i < 60; i++) w.stepOnce();
    const after = w.snapshot().bodies.find((x) => x.id === b)!.position.x;
    expect(after).toBeLessThan(before);
    // sanity: magnet stayed put
    const mp = w.snapshot().bodies.find((x) => x.id === m)!.position;
    expect(Math.hypot(mp.x, mp.y)).toBeLessThan(1e-6);
  });

  it("wood ball is unaffected by a magnet (gravity disabled)", () => {
    const w = new World();
    w.setGravityEnabled(false);
    w.add(magnet({ position: { x: 0, y: 0 }, radius: 0.2, dipole: 20, fixed: true }));
    const b = w.add(ball({ position: { x: 1.5, y: 0 }, radius: 0.1, material: "wood" }));
    const before = w.snapshot().bodies.find((x) => x.id === b)!.position.x;
    for (let i = 0; i < 60; i++) w.stepOnce();
    const after = w.snapshot().bodies.find((x) => x.id === b)!.position.x;
    expect(Math.abs(after - before)).toBeLessThan(1e-6);
  });

  it("charged ball is unaffected by a magnet (no Lorentz force)", () => {
    const w = new World();
    w.setGravityEnabled(false);
    w.add(magnet({ position: { x: 0, y: 0 }, radius: 0.2, dipole: 20, fixed: true }));
    // Use a non-ferromagnetic material so only the charge is in play.
    const b = w.add(
      ball({
        position: { x: 1.5, y: 0 },
        radius: 0.1,
        material: "wood",
        charge: 5,
        velocity: { x: 0, y: 2 },
      }),
    );
    const before = w.snapshot().bodies.find((x) => x.id === b)!.position;
    for (let i = 0; i < 60; i++) w.stepOnce();
    const after = w.snapshot().bodies.find((x) => x.id === b)!.position;
    // Pure ballistic drift (v·t with no forces): x stays, y advances linearly.
    expect(Math.abs(after.x - before.x)).toBeLessThan(1e-6);
    expect(after.y).toBeGreaterThan(before.y);
  });
});
