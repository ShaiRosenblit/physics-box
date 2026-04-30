import { describe, expect, it } from "vitest";
import { defaultConfig } from "../core/config";
import type { Id } from "../core/types";
import { computeBuoyancyForces } from "../mechanics/buoyancy";

describe("computeBuoyancyForces", () => {
  it("applies ρ A (−g) upward when gravity points down", () => {
    const cfg = { ...defaultConfig, fluidDensity: 0.5 };
    const g = { x: 0, y: -10 };
    const bodies = [
      {
        id: 1 as Id,
        velocity: { x: 0, y: 0 },
        displacedArea: 1,
        buoyancyScale: 1,
        buoyancyLift: 0,
      },
    ];
    const f = computeBuoyancyForces(bodies, g, cfg);
    const fv = f.get(1 as Id)!;
    expect(fv.x).toBe(0);
    expect(fv.y).toBeCloseTo(5, 5);
  });
});
