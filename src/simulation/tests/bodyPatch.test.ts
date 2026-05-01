import { describe, expect, it } from "vitest";
import { mergeBodyPatch } from "../core/bodyPatch";
import { ball } from "../mechanics/ball";

describe("mergeBodyPatch", () => {
  it("merges density override onto ball specs", () => {
    const s = ball({
      position: { x: 0, y: 0 },
      radius: 0.2,
      material: "wood",
    });
    const merged = mergeBodyPatch(s, { density: 5.8 });
    expect(merged.kind).toBe("ball");
    if (merged.kind === "ball") {
      expect(merged.density).toBe(5.8);
    }
  });
});
