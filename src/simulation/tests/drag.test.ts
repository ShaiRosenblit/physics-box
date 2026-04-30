import { describe, expect, it } from "vitest";
import { World, ball, box } from "..";

describe("Drag", () => {
  it("returns null when starting a drag on empty space", () => {
    const world = new World();
    expect(world.startDragAt({ x: 100, y: 100 })).toBeNull();
    expect(world.dragging).toBe(false);
  });

  it("does not pick up static bodies", () => {
    const world = new World();
    world.add(
      box({
        position: { x: 0, y: -0.25 },
        width: 4,
        height: 0.5,
        fixed: true,
      }),
    );
    expect(world.startDragAt({ x: 0, y: -0.25 })).toBeNull();
    expect(world.dragging).toBe(false);
  });

  it("picks up the dynamic body under the cursor and tracks the target", () => {
    const world = new World();
    const id = world.add(
      ball({ position: { x: 0, y: 5 }, radius: 0.5, material: "metal" }),
    );

    expect(world.startDragAt({ x: 0, y: 5 })).toBe(id);
    expect(world.dragging).toBe(true);

    world.updateDrag({ x: 3, y: 7 });
    for (let i = 0; i < 240; i++) world.stepOnce();

    const view = world.snapshot().bodies.find((b) => b.id === id)!;
    expect(view.kind).toBe("ball");
    expect(view.position.x).toBeCloseTo(3, 1);
    expect(view.position.y).toBeCloseTo(7, 1);
  });

  it("releases the body when endDrag is called", () => {
    const world = new World();
    const id = world.add(ball({ position: { x: 0, y: 5 }, radius: 0.5 }));
    world.startDragAt({ x: 0, y: 5 });
    expect(world.dragging).toBe(true);
    world.endDrag();
    expect(world.dragging).toBe(false);
    world.updateDrag({ x: 10, y: 10 });
    for (let i = 0; i < 60; i++) world.stepOnce();
    const view = world.snapshot().bodies.find((b) => b.id === id)!;
    expect(view.position.x).toBeCloseTo(0, 0);
    expect(view.position.y).toBeLessThan(5);
  });

  it("removing a dragged body ends the drag cleanly", () => {
    const world = new World();
    const id = world.add(ball({ position: { x: 0, y: 5 }, radius: 0.5 }));
    world.startDragAt({ x: 0, y: 5 });
    world.remove(id);
    expect(world.dragging).toBe(false);
  });

  it("starting a drag while already dragging swaps bodies", () => {
    const world = new World();
    const a = world.add(ball({ position: { x: -2, y: 5 }, radius: 0.4 }));
    const b = world.add(ball({ position: { x: 2, y: 5 }, radius: 0.4 }));

    expect(world.startDragAt({ x: -2, y: 5 })).toBe(a);
    expect(world.dragging).toBe(true);
    expect(world.startDragAt({ x: 2, y: 5 })).toBe(b);
    expect(world.dragging).toBe(true);
    world.endDrag();
    expect(world.dragging).toBe(false);
  });
});
