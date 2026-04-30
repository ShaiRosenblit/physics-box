import { describe, expect, it } from "vitest";
import {
  World,
  balloon,
  ball,
  box,
  defaultConfig,
  playbackTimeScaleMax,
  playbackTimeScaleMin,
  type BallView,
  type BoxView,
} from "..";

const TICK = defaultConfig.dt;

function stepFor(world: World, ticks: number): void {
  for (let i = 0; i < ticks; i++) world.stepOnce();
}

describe("World", () => {
  it("starts at tick 0 with no bodies", () => {
    const world = new World();
    const snap = world.snapshot();
    expect(snap.tick).toBe(0);
    expect(snap.time).toBe(0);
    expect(snap.bodies.length).toBe(0);
  });

  it("issues stable, monotonically increasing ids", () => {
    const world = new World();
    const a = world.add(ball({ position: { x: 0, y: 5 }, radius: 0.5 }));
    const b = world.add(ball({ position: { x: 1, y: 5 }, radius: 0.5 }));
    const c = world.add(box({ position: { x: 2, y: 5 }, width: 1, height: 1 }));
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it("returns frozen snapshots that the caller cannot mutate", () => {
    const world = new World();
    world.add(ball({ position: { x: 0, y: 5 }, radius: 0.5 }));
    const snap = world.snapshot();
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.bodies)).toBe(true);
    expect(Object.isFrozen(snap.bodies[0])).toBe(true);
  });

  it("advances the tick counter once per fixed substep", () => {
    const world = new World();
    expect(world.tick).toBe(0);
    world.step(TICK * 5 + TICK * 0.1);
    expect(world.tick).toBe(5);
  });

  it("does not advance when paused", () => {
    const world = new World();
    world.pause();
    world.step(TICK * 10);
    expect(world.tick).toBe(0);
  });

  it("removes bodies cleanly", () => {
    const world = new World();
    const id = world.add(ball({ position: { x: 0, y: 5 }, radius: 0.5 }));
    expect(world.snapshot().bodies.length).toBe(1);
    world.remove(id);
    expect(world.snapshot().bodies.length).toBe(0);
    world.remove(id);
    expect(world.snapshot().bodies.length).toBe(0);
  });

  it("emits add/remove/step events", () => {
    const world = new World();
    const adds: number[] = [];
    const removes: number[] = [];
    const steps: number[] = [];
    world.on("add", ({ id }) => adds.push(id));
    world.on("remove", ({ id }) => removes.push(id));
    world.on("step", ({ tick }) => steps.push(tick));
    const id = world.add(ball({ position: { x: 0, y: 1 }, radius: 0.5 }));
    world.stepOnce();
    world.remove(id);
    expect(adds).toEqual([id]);
    expect(removes).toEqual([id]);
    expect(steps).toEqual([1]);
  });

  it("reset() returns the world to a fresh state but keeps subscriptions", () => {
    const world = new World();
    const events: string[] = [];
    world.on("step", () => events.push("step"));
    world.on("add", () => events.push("add"));

    world.add(ball({ position: { x: 0, y: 5 }, radius: 0.5 }));
    world.stepOnce();
    expect(world.tick).toBe(1);
    expect(world.snapshot().bodies.length).toBe(1);

    world.reset();
    expect(world.tick).toBe(0);
    expect(world.snapshot().bodies.length).toBe(0);
    expect(world.running).toBe(true);

    const id = world.add(ball({ position: { x: 0, y: 5 }, radius: 0.5 }));
    expect(id).toBe(1);
    expect(events).toContain("step");
    expect(events.filter((e) => e === "add").length).toBe(2);
  });

  it("does not accelerate dynamic bodies when gravity is disabled", () => {
    const world = new World();
    world.setGravityEnabled(false);
    const id = world.add(ball({ position: { x: 0, y: 5 }, radius: 0.5 }));
    stepFor(world, 240);
    const view = world.snapshot().bodies.find((b) => b.id === id)!;
    expect(view.position.y).toBeCloseTo(5, 0);
  });

  it("keeps gravity preference across reset()", () => {
    const world = new World();
    world.setGravityEnabled(false);
    world.add(ball({ position: { x: 0, y: 5 }, radius: 0.5 }));
    world.reset();
    const id = world.add(ball({ position: { x: 0, y: 5 }, radius: 0.5 }));
    stepFor(world, 120);
    expect(world.snapshot().bodies.find((b) => b.id === id)!.position.y).toBeCloseTo(
      5,
      0,
    );
    expect(world.gravityEnabled).toBe(false);
  });

  it("falls under gravity and rests on a static box (collision)", () => {
    const world = new World();
    const groundTopY = 0;
    const groundHeight = 0.5;
    const groundCenterY = groundTopY - groundHeight / 2;
    world.add(
      box({
        position: { x: 0, y: groundCenterY },
        width: 20,
        height: groundHeight,
        fixed: true,
      }),
    );
    const radius = 0.5;
    const ballId = world.add(
      ball({ position: { x: 0, y: 5 }, radius, material: "metal" }),
    );

    stepFor(world, 600);

    const view = world
      .snapshot()
      .bodies.find((b) => b.id === ballId)!;
    expect(view.kind).toBe("ball");
    expect(view.position.y).toBeGreaterThan(groundTopY);
    expect(view.position.y).toBeLessThan(groundTopY + radius * 1.5);
    expect(Math.abs(view.velocity.y)).toBeLessThan(0.05);
  });

  it("dynamic balls may opt out of ball–ball collisions", () => {
    const world = new World();
    world.add(
      box({
        position: { x: 0, y: -0.25 },
        width: 20,
        height: 0.5,
        fixed: true,
      }),
    );
    world.add(
      ball({
        position: { x: 0, y: 2 },
        radius: 0.2,
        collideWithBalls: false,
      }),
    );
    world.add(
      ball({
        position: { x: 0.15, y: 2 },
        radius: 0.2,
        collideWithBalls: false,
      }),
    );
    stepFor(world, 360);
    const marbles = world.snapshot().bodies.filter((b) => b.kind === "ball");
    const sepMarble = Math.hypot(
      marbles[0].position.x - marbles[1].position.x,
      marbles[0].position.y - marbles[1].position.y,
    );
    expect(sepMarble).toBeLessThan(0.32);

    const world2 = new World();
    world2.add(
      box({
        position: { x: 0, y: -0.25 },
        width: 20,
        height: 0.5,
        fixed: true,
      }),
    );
    world2.add(ball({ position: { x: 0, y: 2 }, radius: 0.2 }));
    world2.add(ball({ position: { x: 0.15, y: 2 }, radius: 0.2 }));
    stepFor(world2, 360);
    const pair = world2.snapshot().bodies.filter((b) => b.kind === "ball");
    const sepDefault = Math.hypot(
      pair[0].position.x - pair[1].position.x,
      pair[0].position.y - pair[1].position.y,
    );
    expect(sepDefault).toBeGreaterThan(0.38);
  });

  it("patchBody updates scalars and clamps charge", () => {
    const world = new World();
    const id = world.add(ball({ position: { x: 0, y: 5 }, radius: 0.5 }));
    expect(world.charges.has(id)).toBe(false);
    world.patchBody(id, { charge: 10 });
    let v = world.snapshot().bodies.find((b) => b.id === id)! as BallView;
    expect(v.charge).toBe(10);
    expect(world.charges.has(id)).toBe(true);
    world.patchBody(id, { charge: defaultConfig.maxCharge + 10 });
    v = world.snapshot().bodies.find((b) => b.id === id)! as BallView;
    expect(v.charge).toBe(defaultConfig.maxCharge);
    world.patchBody(id, { charge: 0 });
    expect(world.charges.has(id)).toBe(false);
  });

  it("patchBody rebuilds geometry while preserving pose", () => {
    const world = new World();
    const id = world.add(ball({ position: { x: 1, y: 2 }, radius: 0.3 }));
    world.patchBody(id, { radius: 0.6 });
    const v = world.snapshot().bodies.find((b) => b.id === id)! as BallView;
    expect(v.radius).toBe(0.6);
    expect(v.position.x).toBeCloseTo(1, 5);
    expect(v.position.y).toBeCloseTo(2, 5);
  });

  it("patchBody lengthens a box upward: bottom face stays fixed", () => {
    const world = new World();
    const id = world.add(
      box({
        position: { x: 0, y: 1 },
        width: 0.4,
        height: 1,
        material: "wood",
      }),
    );
    world.patchBody(id, { height: 2 });
    const v = world.snapshot().bodies.find((b) => b.id === id)! as BoxView;
    expect(v.height).toBe(2);
    expect(v.position.y).toBeCloseTo(1.5, 5);
    expect(v.position.x).toBeCloseTo(0, 5);
  });

  it("patchBody skips bottom anchor when position is set in the same patch", () => {
    const world = new World();
    const id = world.add(
      box({
        position: { x: 0, y: 1 },
        width: 0.4,
        height: 1,
      }),
    );
    world.patchBody(id, { height: 2, position: { x: 0, y: 1 } });
    const v = world.snapshot().bodies.find((b) => b.id === id)! as BoxView;
    expect(v.position.y).toBeCloseTo(1, 5);
  });

  it("patchBody fixes body and ends mouse drag session", () => {
    const world = new World();
    const id = world.add(ball({ position: { x: 0, y: 5 }, radius: 0.4 }));
    world.startDragAt({ x: 0, y: 5 });
    expect(world.dragging).toBe(true);
    world.patchBody(id, { fixed: true });
    expect(world.dragging).toBe(false);
    expect(world.snapshot().bodies.find((b) => b.id === id)!.fixed).toBe(true);
  });

  it("balloon rises with prescriptive lift under gravity", () => {
    const world = new World();
    const id = world.add(
      balloon({
        position: { x: 0, y: 0.5 },
        radius: 0.3,
        buoyancyLift: 25,
      }),
    );
    stepFor(world, 200);
    const v = world.snapshot().bodies.find((b) => b.id === id)!;
    expect(v.position.y).toBeGreaterThan(1.2);
  });

  it("cork ball rises when ambient fluid is denser than cork", () => {
    const world = new World({ ...defaultConfig, fluidDensity: 0.35 });
    world.add(
      box({
        position: { x: 0, y: -0.25 },
        width: 20,
        height: 0.5,
        fixed: true,
      }),
    );
    const id = world.add(
      ball({
        position: { x: 0, y: 1.2 },
        radius: 0.35,
        material: "cork",
      }),
    );
    stepFor(world, 400);
    const v = world.snapshot().bodies.find((b) => b.id === id)!;
    expect(v.position.y).toBeGreaterThan(2.5);
  });

  it("buoyancyScale 0 suppresses lift on a balloon", () => {
    const world = new World();
    world.add(
      box({
        position: { x: 0, y: -0.25 },
        width: 20,
        height: 0.5,
        fixed: true,
      }),
    );
    const id = world.add(
      balloon({
        position: { x: 0, y: 2 },
        radius: 0.3,
        buoyancyLift: 40,
        buoyancyScale: 0,
      }),
    );
    stepFor(world, 200);
    const v = world.snapshot().bodies.find((b) => b.id === id)!;
    expect(v.position.y).toBeLessThan(1.5);
  });

  it("setFluidDensity is re-seeded from config on reset", () => {
    const world = new World({ ...defaultConfig, fluidDensity: 0.2 });
    world.setFluidDensity(0.5);
    expect(world.config.fluidDensity).toBeCloseTo(0.5, 5);
    world.reset();
    expect(world.config.fluidDensity).toBeCloseTo(0.2, 5);
  });

  it("preserves runtime timeScale across reset", () => {
    const world = new World({ ...defaultConfig, timeScale: 0.5 });
    world.setTimeScale(0.25);
    world.reset();
    expect(world.config.timeScale).toBe(0.25);
  });

  it("setTimeScale clamps and scales snapshot time", () => {
    const world = new World({ ...defaultConfig, timeScale: 0.5 });
    world.setTimeScale(99);
    expect(world.config.timeScale).toBe(playbackTimeScaleMax);
    world.setTimeScale(0);
    expect(world.config.timeScale).toBe(playbackTimeScaleMin);

    world.setTimeScale(0.25);
    world.pause();
    world.stepOnce();
    expect(world.snapshot().time).toBeCloseTo(TICK * 0.25, 12);
  });
});
