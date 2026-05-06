import { describe, expect, test } from "vitest";
import { World, ball } from "../../simulation";
import { evaluateGoal } from "../winConditions";
import { level15ChargedPendulum } from "./level15_chargedPendulum";

const FIXED_DT_S = 1 / 120;
function stepSeconds(world: World, seconds: number): void {
  const ticks = Math.round(seconds / FIXED_DT_S);
  for (let i = 0; i < ticks; i++) world.stepOnce();
}

/**
 * Solvability harness — guard against tuning regressions. Builds the
 * level via `setupScene`, places the canonical solver charge, lets the
 * world run, and asserts the goal evaluates to `won`. If a future
 * physics or material tweak makes the level unwinnable at this
 * placement, the test fires.
 */
describe("Level 15 — Charged Pendulum: solvability", () => {
  test("a +charge placed left-of-bob deflects it out of the fall column", () => {
    const world = new World();
    const handles = level15ChargedPendulum.setupScene(world);

    // Solver: place a fixed +charge to the LEFT of the bob's resting
    // position (bobX = 0). Attraction pulls the (−) bob left, out of
    // the bucket column directly under bobX.
    world.add(
      ball({
        position: { x: -2.5, y: 4.0 },
        radius: 0.18,
        material: "metal",
        charge: 4,
        fixed: true,
      }),
    );

    // Run long enough for the bob to settle in its deflected position
    // AND for the marble to roll off, fall, and land.
    stepSeconds(world, 6);

    const status = evaluateGoal(
      world.snapshot(),
      level15ChargedPendulum.goal,
      handles,
    );
    expect(status).toBe("won");
  });

  test("without any charge the marble is bumped off course and misses", () => {
    const world = new World();
    const handles = level15ChargedPendulum.setupScene(world);

    stepSeconds(world, 6);

    const status = evaluateGoal(
      world.snapshot(),
      level15ChargedPendulum.goal,
      handles,
    );
    // Bob blocks the column → marble caroms off → misses bucket.
    expect(status).toBe("pending");
  });
});
