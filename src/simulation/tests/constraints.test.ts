import { describe, expect, it } from "vitest";
import {
  World,
  ball,
  box,
  hinge,
  pulley,
  rope,
  spring,
  worldAnchor,
  bodyAnchor,
  defaultConfig,
} from "..";

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe("patchConstraint", () => {
  it("updates spring rest length and frequency without changing anchors", () => {
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    const a = world.add(
      ball({ position: { x: 0, y: 0 }, radius: 0.2, material: "metal" }),
    );
    const b = world.add(
      ball({ position: { x: 1.5, y: 0 }, radius: 0.2, material: "metal" }),
    );
    const id = world.addConstraint(
      spring({
        a: bodyAnchor(a),
        b: bodyAnchor(b),
        restLength: 1.2,
        frequencyHz: 2,
        dampingRatio: 0.1,
      }),
    );
    world.patchConstraint(id, { restLength: 0.8, frequencyHz: 5 });
    const v = world.snapshot().constraints.find((c) => c.id === id);
    expect(v?.kind).toBe("spring");
    if (v?.kind !== "spring") return;
    expect(v.restLength).toBeCloseTo(0.8, 5);
    expect(v.frequencyHz).toBeCloseTo(5, 5);
  });

  it("rebuilds rope when nominal length changes", () => {
    const world = new World();
    const id = world.addConstraint(
      rope({
        a: worldAnchor({ x: 0, y: 5 }),
        b: worldAnchor({ x: 1, y: 5 }),
        length: 2,
        segments: 8,
      }),
    );
    world.patchConstraint(id, { length: 2.8 });
    const v = world.snapshot().constraints.find((c) => c.id === id);
    expect(v?.kind).toBe("rope");
    if (v?.kind !== "rope") return;
    expect(v.nominalLength).toBeCloseTo(2.8, 5);
  });
});

describe("Rope", () => {
  it("settles into a hanging chain whose path length stays close to its configured length", () => {
    const world = new World();
    const ropeLength = 3.5;
    const id = world.addConstraint(
      rope({
        a: worldAnchor({ x: 0, y: 5 }),
        b: worldAnchor({ x: 3, y: 5 }),
        length: ropeLength,
        segments: 14,
      }),
    );
    for (let i = 0; i < 720; i++) world.stepOnce();

    const view = world.snapshot().constraints.find((c) => c.id === id);
    expect(view?.kind).toBe("rope");
    if (view?.kind !== "rope") return;

    let pathLen = 0;
    for (let i = 1; i < view.path.length; i++) {
      pathLen += dist(view.path[i - 1], view.path[i]);
    }
    const chord = dist(view.path[0], view.path[view.path.length - 1]);
    expect(pathLen).toBeGreaterThan(chord);
    expect(pathLen).toBeGreaterThan(ropeLength * 0.85);
    expect(pathLen).toBeLessThan(ropeLength * 1.15);
  });

  it("rigid rope (segments: 0) keeps anchor–bob separation at rod length under gravity", () => {
    const world = new World();
    const bob = world.add(
      ball({ position: { x: 0, y: 3 }, radius: 0.15, material: "metal" }),
    );
    const rodLength = 2;
    const id = world.addConstraint(
      rope({
        a: worldAnchor({ x: 0, y: 5 }),
        b: bodyAnchor(bob),
        length: rodLength,
        segments: 0,
      }),
    );
    const snap0 = world.snapshot();
    const view0 = snap0.constraints.find((c) => c.id === id);
    expect(view0?.kind).toBe("rope");
    if (view0?.kind !== "rope") return;
    expect(view0.segmentLinks).toBe(0);
    expect(view0.path.length).toBe(2);

    for (let i = 0; i < 240; i++) world.stepOnce();
    const bobEnd = world.snapshot().bodies.find((b) => b.id === bob)!;
    const separation = dist({ x: 0, y: 5 }, bobEnd.position);
    expect(separation).toBeGreaterThan(rodLength - 0.06);
    expect(separation).toBeLessThan(rodLength + 0.06);
  });

  it("removes its segments when the constraint is removed", () => {
    const world = new World();
    const id = world.addConstraint(
      rope({
        a: worldAnchor({ x: 0, y: 4 }),
        b: worldAnchor({ x: 2, y: 4 }),
        length: 2.5,
        segments: 8,
      }),
    );
    expect(world.snapshot().constraints.length).toBe(1);
    world.remove(id);
    expect(world.snapshot().constraints.length).toBe(0);
  });
});

describe("Spring", () => {
  it("oscillates two free bodies around its rest length and stays bounded", () => {
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    const a = world.add(
      ball({ position: { x: -1, y: 0 }, radius: 0.2, material: "metal" }),
    );
    const b = world.add(
      ball({ position: { x: 2, y: 0 }, radius: 0.2, material: "metal" }),
    );
    const restLength = 1;
    world.addConstraint(
      spring({
        a: bodyAnchor(a),
        b: bodyAnchor(b),
        restLength,
        frequencyHz: 3,
        dampingRatio: 0.05,
      }),
    );

    let minSeparation = Infinity;
    let maxSeparation = -Infinity;
    for (let i = 0; i < 600; i++) {
      world.stepOnce();
      const snap = world.snapshot();
      const va = snap.bodies.find((x) => x.id === a)!;
      const vb = snap.bodies.find((x) => x.id === b)!;
      const sep = dist(va.position, vb.position);
      if (sep < minSeparation) minSeparation = sep;
      if (sep > maxSeparation) maxSeparation = sep;
    }
    expect(minSeparation).toBeLessThan(restLength);
    expect(maxSeparation).toBeGreaterThan(restLength);
    expect(maxSeparation).toBeLessThan(3.5);
  });

  it("oscillation period of a single mass on a wall spring is close to 1/frequencyHz", () => {
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: 0 } });
    const wall = { x: 0, y: 0 };
    const restLength = 1;
    const m = world.add(
      ball({ position: { x: restLength + 0.5, y: 0 }, radius: 0.2, material: "metal" }),
    );
    const freq = 2;
    world.addConstraint(
      spring({
        a: worldAnchor(wall),
        b: bodyAnchor(m),
        restLength,
        frequencyHz: freq,
        dampingRatio: 0.0,
      }),
    );

    const samples: { t: number; x: number }[] = [];
    for (let i = 0; i < 1200; i++) {
      world.stepOnce();
      const snap = world.snapshot();
      const view = snap.bodies.find((b) => b.id === m)!;
      samples.push({ t: snap.time, x: view.position.x });
    }
    const zeros: number[] = [];
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1].x - restLength;
      const b = samples[i].x - restLength;
      if (a > 0 && b <= 0) zeros.push(samples[i].t);
    }
    expect(zeros.length).toBeGreaterThanOrEqual(2);
    const avgPeriod =
      (zeros[zeros.length - 1] - zeros[0]) / (zeros.length - 1);
    expect(avgPeriod).toBeGreaterThan(0.7 / freq);
    expect(avgPeriod).toBeLessThan(1.3 / freq);
  });
});

describe("Pulley", () => {
  it("couples two dynamic bodies without blowing up over fixed substeps", () => {
    const world = new World();
    const a = world.add(
      ball({
        position: { x: -1.0, y: 2.4 },
        radius: 0.25,
        material: "metal",
      }),
    );
    const b = world.add(
      ball({
        position: { x: 1.0, y: 2.4 },
        radius: 0.25,
        material: "wood",
      }),
    );
    const id = world.addConstraint(
      pulley({
        wheelCenter: { x: 0, y: 4.5 },
        bodyA: a,
        bodyB: b,
        localAnchorA: { x: 0, y: 0.25 },
        localAnchorB: { x: 0, y: 0.25 },
      }),
    );

    for (let i = 0; i < 480; i++) world.stepOnce();

    const view = world.snapshot().constraints.find((c) => c.id === id);
    expect(view?.kind).toBe("pulley");
    if (view?.kind !== "pulley") return;

    const ba = world.snapshot().bodies.find((x) => x.id === a)!;
    const bb = world.snapshot().bodies.find((x) => x.id === b)!;
    expect(Number.isFinite(ba.position.x)).toBe(true);
    expect(Number.isFinite(bb.position.y)).toBe(true);
    expect(Math.abs(ba.position.y)).toBeLessThan(20);
    expect(Math.abs(bb.position.y)).toBeLessThan(20);
    expect(view.ratio).toBe(1);
  });

  it("is removed cleanly like other constraints", () => {
    const world = new World();
    const a = world.add(ball({ position: { x: -0.5, y: 2 }, radius: 0.2 }));
    const b = world.add(ball({ position: { x: 0.5, y: 2 }, radius: 0.2 }));
    const id = world.addConstraint(
      pulley({
        wheelCenter: { x: 0, y: 4 },
        bodyA: a,
        bodyB: b,
        localAnchorA: { x: 0, y: 0 },
        localAnchorB: { x: 0, y: 0 },
      }),
    );
    expect(world.snapshot().constraints.length).toBe(1);
    world.remove(id);
    expect(world.snapshot().constraints.length).toBe(0);
  });
});

describe("Hinge", () => {
  it("constrains a body to rotate around the anchor without translating it", () => {
    const world = new World();
    const armCenter = { x: 1, y: 5 };
    const arm = world.add(
      box({
        position: armCenter,
        width: 2,
        height: 0.2,
        material: "metal",
      }),
    );
    const anchor = { x: 0, y: 5 };
    world.addConstraint(hinge({ bodyA: arm, worldAnchor: anchor }));

    const initialDist = dist(armCenter, anchor);
    for (let i = 0; i < 480; i++) world.stepOnce();
    const view = world.snapshot().bodies.find((b) => b.id === arm)!;
    const finalDist = dist(view.position, anchor);
    expect(Math.abs(finalDist - initialDist)).toBeLessThan(0.05);
    expect(view.position.y).toBeLessThan(armCenter.y);
  });
});
