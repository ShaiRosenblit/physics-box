import { describe, expect, it } from "vitest";
import { ball, World } from "../../simulation";
import { evaluateGoal } from "../winConditions";
import { level90Tripwire } from "./level90_tripwire";

describe("level 90: Tripwire", () => {
  it("constructs without errors", () => {
    expect(() => level90Tripwire.setupScene(new World())).not.toThrow();
  });

  it("the unloaded rope holds — marble stays suspended on its own", () => {
    const world = new World();
    const handles = level90Tripwire.setupScene(world);
    for (let i = 0; i < 1800; i++) world.stepOnce();
    expect(
      evaluateGoal(world.snapshot(), level90Tripwire.goal, handles),
    ).not.toBe("won");
  });

  it("solves when an extra ball is dropped onto the marble", () => {
    const world = new World();
    const handles = level90Tripwire.setupScene(world);
    world.add(
      ball({
        position: { x: 0, y: 5.5 },
        radius: 0.18,
        material: "metal",
      }),
    );
    let won = false;
    for (let i = 0; i < 2400; i++) {
      world.stepOnce();
      if (
        evaluateGoal(world.snapshot(), level90Tripwire.goal, handles) === "won"
      ) {
        won = true;
        break;
      }
    }
    expect(won).toBe(true);
  });
});
