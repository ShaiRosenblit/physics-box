import { describe, expect, it } from "vitest";
import {
  World,
  ball,
  bodyAnchor,
  crank,
  defaultConfig,
  hinge,
  rope,
} from "..";

describe("crank wheel", () => {
  it("drives linear motion at the pin via a rope", () => {
    const world = new World({ ...defaultConfig, gravity: { x: 0, y: -10 } });
    const hubY = 2.0;
    const cid = world.add(
      crank({
        position: { x: 0, y: hubY },
        radius: 0.2,
        pinRadius: 0.12,
        material: "metal",
        angularVelocity: 3,
        angularDamping: 0,
      }),
    );
    world.addConstraint(
      hinge({ bodyA: cid, worldAnchor: { x: 0, y: hubY } }),
    );
    const bid = world.add(
      ball({
        position: { x: 0, y: 0.9 },
        radius: 0.08,
        material: "cork",
        linearDamping: 0.2,
      }),
    );
    world.addConstraint(
      rope({
        a: bodyAnchor(cid, { x: 0.12, y: 0 }),
        b: bodyAnchor(bid),
        length: 1.05,
        segments: 8,
        material: "wood",
      }),
    );

    let maxSpeed = 0;
    for (let i = 0; i < 400; i++) {
      world.stepOnce();
      const b = world.snapshot().bodies.find((x) => x.id === bid);
      if (b) {
        const sp = Math.hypot(b.velocity.x, b.velocity.y);
        if (sp > maxSpeed) maxSpeed = sp;
      }
    }
    expect(maxSpeed).toBeGreaterThan(0.15);
  });

  it("exposes pin offset in snapshot for rope attachment", () => {
    const world = new World({ ...defaultConfig });
    const id = world.add(
      crank({
        position: { x: 1, y: 2 },
        radius: 0.15,
        pinLocal: { x: 0.1, y: -0.05 },
        fixed: true,
      }),
    );
    const v = world.snapshot().bodies.find((b) => b.id === id);
    expect(v?.kind).toBe("crank");
    if (v?.kind === "crank") {
      expect(v.pinLocal.x).toBeCloseTo(0.1, 6);
      expect(v.pinLocal.y).toBeCloseTo(-0.05, 6);
    }
  });
});
