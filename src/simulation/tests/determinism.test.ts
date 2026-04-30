import { describe, expect, it } from "vitest";
import { World, ball, box, type Snapshot } from "..";

function buildScene(world: World): void {
  world.add(
    box({
      position: { x: 0, y: -0.25 },
      width: 20,
      height: 0.5,
      fixed: true,
    }),
  );
  world.add(ball({ position: { x: -1.0, y: 4.0 }, radius: 0.4, material: "metal" }));
  world.add(ball({ position: { x: 0.6, y: 5.5 }, radius: 0.5, material: "wood" }));
  world.add(ball({ position: { x: 1.4, y: 6.2 }, radius: 0.3, material: "cork" }));
  world.add(box({ position: { x: -1.8, y: 7.0 }, width: 0.8, height: 0.8 }));
}

function runScenario(ticks: number): Snapshot[] {
  const world = new World();
  buildScene(world);
  const out: Snapshot[] = [];
  for (let i = 0; i < ticks; i++) {
    world.stepOnce();
    if (i % 30 === 0 || i === ticks - 1) out.push(world.snapshot());
  }
  return out;
}

describe("Determinism", () => {
  it("produces identical snapshots for identical scenarios", () => {
    const a = runScenario(600);
    const b = runScenario(600);
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      const sa = a[i];
      const sb = b[i];
      expect(sa.tick).toBe(sb.tick);
      expect(sa.bodies.length).toBe(sb.bodies.length);
      for (let j = 0; j < sa.bodies.length; j++) {
        const ba = sa.bodies[j];
        const bb = sb.bodies[j];
        expect(ba.id).toBe(bb.id);
        expect(ba.kind).toBe(bb.kind);
        expect(ba.position.x).toBe(bb.position.x);
        expect(ba.position.y).toBe(bb.position.y);
        expect(ba.angle).toBe(bb.angle);
        expect(ba.velocity.x).toBe(bb.velocity.x);
        expect(ba.velocity.y).toBe(bb.velocity.y);
        expect(ba.angularVelocity).toBe(bb.angularVelocity);
      }
    }
  });

  it("step(dt) per tick and stepOnce() converge to the same state", () => {
    const ticks = 240;
    const worldA = new World();
    buildScene(worldA);
    for (let i = 0; i < ticks; i++) worldA.stepOnce();

    const worldB = new World();
    buildScene(worldB);
    for (let i = 0; i < ticks; i++) worldB.step(worldB.config.dt);

    const sa = worldA.snapshot();
    const sb = worldB.snapshot();
    expect(sa.tick).toBe(sb.tick);
    for (let j = 0; j < sa.bodies.length; j++) {
      expect(sa.bodies[j].position.x).toBeCloseTo(sb.bodies[j].position.x, 9);
      expect(sa.bodies[j].position.y).toBeCloseTo(sb.bodies[j].position.y, 9);
    }
  });

  it("clamps real-time bursts at maxSubsteps to prevent spiral-of-death", () => {
    const world = new World();
    buildScene(world);
    const substeps = world.step(10);
    expect(substeps).toBe(world.config.maxSubsteps);
    expect(world.tick).toBe(world.config.maxSubsteps);
  });
});
