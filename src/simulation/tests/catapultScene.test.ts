import { describe, expect, it } from "vitest";
import { World, defaultConfig, catapult } from "..";

describe("catapult scene", () => {
  it("spring-driven arm launches the cork shot forward along +x", () => {
    const world = new World({ ...defaultConfig });
    catapult(world);

    const initial = world.snapshot();
    const projectile = initial.bodies.find(
      (b) => b.kind === "ball" && b.material === "cork" && b.radius === 0.11,
    );
    expect(projectile).toBeTruthy();
    if (!projectile) return;

    const x0 = projectile.position.x;
    for (let i = 0; i < 480; i++) world.stepOnce();

    const later = world.snapshot().bodies.find((b) => b.id === projectile.id);
    expect(later).toBeTruthy();
    if (!later) return;

    expect(later.position.x).toBeGreaterThan(x0 + 2.5);
    expect(later.velocity.x).toBeGreaterThan(1);
  });
});
