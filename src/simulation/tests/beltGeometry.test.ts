import { describe, expect, it } from "vitest";
import {
  beltDisplayPath,
  computeOpenBeltTangents,
} from "../core/beltGeometry";

describe("beltGeometry", () => {
  it("places outer tangent contacts on both circles", () => {
    const c1 = { x: 0, y: 0 };
    const c2 = { x: 3, y: 0 };
    const r1 = 0.5;
    const r2 = 0.2;
    const t = computeOpenBeltTangents(c1, r1, c2, r2);
    expect(t).not.toBeNull();
    if (!t) return;
    const d1u = Math.hypot(t.ua1.x - c1.x, t.ua1.y - c1.y);
    const d2u = Math.hypot(t.ua2.x - c2.x, t.ua2.y - c2.y);
    expect(d1u).toBeCloseTo(r1, 5);
    expect(d2u).toBeCloseTo(r2, 5);
    const run = Math.hypot(t.ua2.x - t.ua1.x, t.ua2.y - t.ua1.y);
    expect(run).toBeGreaterThan(0.1);
  });

  it("buildDisplayPath returns a closed quadrilateral for separated pulleys", () => {
    const path = beltDisplayPath({ x: 0, y: 0 }, 0.4, { x: 2, y: 0.3 }, 0.25);
    expect(path.length).toBe(4);
  });
});
