import type { Graphics } from "pixi.js";

/**
 * Pixi triangulates {@link Graphics.circle} with slice count
 * `ceil(2.3 * sqrt(rx + ry))` (see `pixi.js` `buildCircle.mjs`). Sandbox radii
 * are often ~0.04 world units, so the mesh collapses to four vertices—a square
 * that reads as a diamond when bodies rotate. Prefer an explicit polygon with
 * enough sides for the on-screen circumference.
 */
export function approxCircleSides(
  rWorld: number,
  cameraZoom: number,
): number {
  const z = Math.max(Math.abs(cameraZoom), 1e-3);
  const circumferencePx = 2 * Math.PI * rWorld * z;
  return Math.round(
    Math.min(96, Math.max(16, circumferencePx / 8)),
  );
}

/** Same as {@link Graphics.circle} for fill/stroke, without the quad degeneracy. */
export function drawApproxCircle(
  g: Graphics,
  cx: number,
  cy: number,
  rWorld: number,
  cameraZoom: number,
): void {
  if (rWorld <= 0) return;
  const n = approxCircleSides(rWorld, cameraZoom);
  g.regularPoly(cx, cy, rWorld, n, 0);
}
