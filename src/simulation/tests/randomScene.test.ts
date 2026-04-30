import { describe, expect, it } from "vitest";
import { World } from "..";
import { random } from "../scenes/random";

describe("random scene preset", () => {
  it("builds reproducibly for a fixed seed and steps without invalid state", () => {
    const wA = new World();
    random(wA, 0x9e3779b9);
    const wB = new World();
    random(wB, 0x9e3779b9);

    expect(wA.snapshot().bodies.length).toBe(wB.snapshot().bodies.length);
    expect(wA.snapshot().constraints.length).toBe(
      wB.snapshot().constraints.length,
    );
    expect(wA.snapshot().bodies.length).toBeGreaterThan(18);

    for (let i = 0; i < 240; i++) {
      wA.stepOnce();
    }
    const s = wA.snapshot();
    for (const b of s.bodies) {
      expect(Number.isFinite(b.position.x)).toBe(true);
      expect(Number.isFinite(b.position.y)).toBe(true);
    }
  });
});
