import { describe, expect, it } from "vitest";
import { Camera } from "../camera/Camera";

describe("Camera", () => {
  it("worldToScreen and screenToWorld are inverses", () => {
    const camera = new Camera({ center: { x: 1.5, y: 2.0 }, zoom: 50 });
    camera.setCanvas(800, 600);

    const w = { x: 3.7, y: 4.1 };
    const s = camera.worldToScreen(w.x, w.y);
    const back = camera.screenToWorld(s.x, s.y);
    expect(back.x).toBeCloseTo(w.x, 9);
    expect(back.y).toBeCloseTo(w.y, 9);
  });

  it("renders camera center at canvas center", () => {
    const camera = new Camera({ center: { x: 5, y: 5 }, zoom: 30 });
    camera.setCanvas(800, 600);
    const s = camera.worldToScreen(5, 5);
    expect(s.x).toBeCloseTo(400, 9);
    expect(s.y).toBeCloseTo(300, 9);
  });

  it("flips Y so positive world Y maps to lower screen Y", () => {
    const camera = new Camera({ center: { x: 0, y: 0 }, zoom: 40 });
    camera.setCanvas(800, 600);
    const top = camera.worldToScreen(0, 1);
    const bottom = camera.worldToScreen(0, -1);
    expect(top.y).toBeLessThan(bottom.y);
  });

  it("rejects invalid zoom values", () => {
    const camera = new Camera({ center: { x: 0, y: 0 }, zoom: 40 });
    camera.setZoom(-5);
    expect(camera.zoom).toBe(40);
    camera.setZoom(0);
    expect(camera.zoom).toBe(40);
    camera.setZoom(Number.POSITIVE_INFINITY);
    expect(camera.zoom).toBe(40);
    camera.setZoom(20);
    expect(camera.zoom).toBe(20);
  });

  it("computes visible bounds symmetrically around the camera center", () => {
    const camera = new Camera({ center: { x: 1, y: 2 }, zoom: 100 });
    camera.setCanvas(400, 200);
    const b = camera.visibleBounds();
    expect(b.minX).toBeCloseTo(1 - 2, 9);
    expect(b.maxX).toBeCloseTo(1 + 2, 9);
    expect(b.minY).toBeCloseTo(2 - 1, 9);
    expect(b.maxY).toBeCloseTo(2 + 1, 9);
  });
});
