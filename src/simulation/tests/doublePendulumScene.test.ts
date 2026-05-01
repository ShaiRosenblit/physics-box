import { describe, expect, it } from "vitest";
import { World, defaultConfig, doublePendulum } from "..";

describe("double pendulum scene", () => {
  it("exposes 2 hinges + 2 welds, two links and two bobs, all moving under gravity", () => {
    const world = new World({ ...defaultConfig });
    doublePendulum(world);
    const snap0 = world.snapshot();

    const hinges = snap0.constraints.filter((c) => c.kind === "hinge");
    expect(hinges.length).toBe(2);
    // one hinge has no bodyB (ceiling-to-world)
    expect(hinges.some((c) => c.kind === "hinge" && c.bodyB === undefined)).toBe(true);

    const welds = snap0.constraints.filter((c) => c.kind === "weld");
    expect(welds.length).toBe(2);

    const links = snap0.bodies.filter(
      (b) => b.kind === "box" && b.material === "metal" && !b.fixed,
    );
    expect(links.length).toBe(2);

    const bobs = snap0.bodies.filter((b) => b.kind === "ball" && !b.fixed);
    expect(bobs.length).toBe(2);

    for (let i = 0; i < 360; i++) world.stepOnce();
    const snap1 = world.snapshot();
    for (const b of links) {
      const after = snap1.bodies.find((x) => x.id === b.id);
      expect(after).toBeTruthy();
      if (!after) continue;
      expect(Math.abs(after.angle - b.angle)).toBeGreaterThan(0.05);
    }
  });
});
