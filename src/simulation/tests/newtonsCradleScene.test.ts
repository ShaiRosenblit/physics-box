import { describe, expect, it } from "vitest";
import { World, defaultConfig, newtonsCradle } from "..";

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

    const left = bobs.reduce((a, b) => (b.position.x < a.position.x ? b : a));

    for (let i = 0; i < 240; i++) world.stepOnce();
    const snap1 = world.snapshot();
    const leftAfter = snap1.bodies.find((b) => b.id === left.id);
    expect(leftAfter).toBeTruthy();
    if (!leftAfter) return;
    expect(Math.hypot(leftAfter.velocity.x, leftAfter.velocity.y)).toBeGreaterThan(0.02);
  });
});
