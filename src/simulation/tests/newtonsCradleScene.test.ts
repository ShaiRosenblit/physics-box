import { describe, expect, it } from "vitest";
import { World, defaultConfig, newtonsCradle } from "..";

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe("Newton's cradle scene", () => {
  it("wires five bobs, five ropes, and the first bob moves after stepping", () => {
    const world = new World({ ...defaultConfig });
    newtonsCradle(world);
    const snap0 = world.snapshot();

    const bobs = snap0.bodies.filter(
      (b) => b.kind === "ball" && b.material === "metal" && !b.fixed,
    );
    expect(bobs.length).toBe(5);

    const ropes = snap0.constraints.filter((c) => c.kind === "rope");
    expect(ropes.length).toBe(5);

    for (const c of ropes) {
      expect(c.segmentLinks).toBe(0);
      expect(c.path.length).toBe(2);
    }

    const left = bobs.reduce((a, b) => (b.position.x < a.position.x ? b : a));

    for (let i = 0; i < 240; i++) world.stepOnce();
    const snap1 = world.snapshot();
    const leftAfter = snap1.bodies.find((b) => b.id === left.id);
    expect(leftAfter).toBeTruthy();
    if (!leftAfter) return;
    expect(Math.hypot(leftAfter.velocity.x, leftAfter.velocity.y)).toBeGreaterThan(0.02);
  });

  it("keeps rigid cord length within Planck distance-joint slack after many collisions", () => {
    const world = new World({ ...defaultConfig });
    newtonsCradle(world);

    const nominal = 4.1;
    const slack = 0.07;

    for (let i = 0; i < 900; i++) world.stepOnce();

    const snap = world.snapshot();
    for (const c of snap.constraints) {
      if (c.kind !== "rope") continue;
      expect(c.segmentLinks).toBe(0);
      const [p0, p1] = c.path;
      const span = dist(p0, p1);
      expect(span).toBeGreaterThan(nominal - slack);
      expect(span).toBeLessThan(nominal + slack);
      expect(c.nominalLength).toBeCloseTo(nominal, 5);
    }
  });
});
