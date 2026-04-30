import { Container, Graphics } from "pixi.js";
import {
  emConstants,
  sampleE,
  type ChargedBodyState,
  type ChargedSourceView,
  type SimulationConfig,
  type Vec2,
} from "../../simulation";
import { palette, stroke } from "../style/palette";
import type { Camera } from "../camera/Camera";

/**
 * Render layer for electromagnetic field streamlines.
 *
 * Sources are read from the immutable Snapshot. Streamlines are
 * traced by RK2 integration of the unit field vector, seeded around
 * each charged body. The math itself lives in `simulation/`; this
 * layer is purely about painting.
 */
export class FieldView {
  readonly container = new Container();
  private readonly eGraphics = new Graphics();
  private readonly config: SimulationConfig;

  private showE = true;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.container.addChild(this.eGraphics);
  }

  setShowE(visible: boolean): void {
    this.showE = visible;
    this.eGraphics.visible = visible;
  }

  /**
   * Redraw the field. Cheap to call but should be throttled by the
   * caller for performance.
   */
  update(charges: readonly ChargedSourceView[], camera: Camera): void {
    this.eGraphics.clear();
    if (!this.showE) return;
    if (charges.length === 0) {
      this.eGraphics.visible = false;
      return;
    }
    this.eGraphics.visible = true;

    const states: ChargedBodyState[] = charges.map((c) => ({
      id: c.id,
      position: c.position,
      charge: c.charge,
    }));
    const ec = emConstants(this.config);
    const bounds = camera.visibleBounds();
    const diag = Math.hypot(
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
    );
    const stepSize = Math.max(0.05, diag / 200);
    const maxSteps = 400;
    const lineWidth = stroke.fieldLine / camera.zoom;

    const seedCount = 14;
    const seedRadius = 0.18;

    for (const c of states) {
      if (c.charge === 0) continue;
      const direction = c.charge > 0 ? 1 : -1;
      for (let i = 0; i < seedCount; i++) {
        const theta = (i / seedCount) * Math.PI * 2;
        const seed: Vec2 = {
          x: c.position.x + Math.cos(theta) * seedRadius,
          y: c.position.y + Math.sin(theta) * seedRadius,
        };
        this.traceStreamline(seed, direction, stepSize, maxSteps, states, ec, bounds, lineWidth);
      }
    }
  }

  private traceStreamline(
    start: Vec2,
    direction: 1 | -1,
    stepSize: number,
    maxSteps: number,
    charges: readonly ChargedBodyState[],
    ec: ReturnType<typeof emConstants>,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    lineWidth: number,
  ): void {
    let x = start.x;
    let y = start.y;
    const points: number[] = [x, y];

    const minDist = 0.12;

    for (let step = 0; step < maxSteps; step++) {
      const E1 = sampleE({ x, y }, charges, ec);
      const m1 = Math.hypot(E1.x, E1.y);
      if (m1 < 1e-6) break;
      const ux = (direction * E1.x) / m1;
      const uy = (direction * E1.y) / m1;

      const midX = x + ux * stepSize * 0.5;
      const midY = y + uy * stepSize * 0.5;
      const E2 = sampleE({ x: midX, y: midY }, charges, ec);
      const m2 = Math.hypot(E2.x, E2.y);
      if (m2 < 1e-6) break;
      const vx = (direction * E2.x) / m2;
      const vy = (direction * E2.y) / m2;

      x += vx * stepSize;
      y += vy * stepSize;

      if (
        x < bounds.minX ||
        x > bounds.maxX ||
        y < bounds.minY ||
        y > bounds.maxY
      ) {
        points.push(x, y);
        break;
      }

      let terminated = false;
      for (const c of charges) {
        const ddx = x - c.position.x;
        const ddy = y - c.position.y;
        if (ddx * ddx + ddy * ddy < minDist * minDist) {
          terminated = true;
          break;
        }
      }
      points.push(x, y);
      if (terminated) break;
    }

    if (points.length < 4) return;

    this.eGraphics.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      this.eGraphics.lineTo(points[i], points[i + 1]);
    }
    this.eGraphics.stroke({
      color: palette.fieldE,
      width: lineWidth,
      alpha: 0.55,
    });
  }
}
