import { Container, Graphics } from "pixi.js";
import {
  emConstants,
  sampleE,
  sampleGradB,
  type ChargedBodyState,
  type ChargedSourceView,
  type MagneticBodyState,
  type MagneticSourceView,
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
  private readonly bGraphics = new Graphics();
  private readonly config: SimulationConfig;

  private showE = false;
  private showB = false;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.container.addChild(this.bGraphics);
    this.container.addChild(this.eGraphics);
    this.eGraphics.visible = false;
    this.bGraphics.visible = false;
  }

  setShowE(visible: boolean): void {
    this.showE = visible;
    this.eGraphics.visible = visible;
  }

  setShowB(visible: boolean): void {
    this.showB = visible;
    this.bGraphics.visible = visible;
  }

  /**
   * Redraw the field. Cheap to call but should be throttled by the
   * caller for performance.
   */
  update(
    charges: readonly ChargedSourceView[],
    magnets: readonly MagneticSourceView[],
    camera: Camera,
  ): void {
    this.drawEField(charges, camera);
    this.drawBField(magnets, camera);
  }

  private drawEField(charges: readonly ChargedSourceView[], camera: Camera): void {
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

  private drawBField(
    magnets: readonly MagneticSourceView[],
    camera: Camera,
  ): void {
    this.bGraphics.clear();
    if (!this.showB) return;
    if (magnets.length === 0) {
      this.bGraphics.visible = false;
      return;
    }
    this.bGraphics.visible = true;

    const states: MagneticBodyState[] = magnets.map((m) => ({
      id: m.id,
      position: m.position,
      dipole: m.dipole,
      angle: m.angle,
    }));
    const ec = emConstants(this.config);
    const bounds = camera.visibleBounds();
    const diag = Math.hypot(
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
    );
    const stepSize = Math.max(0.05, diag / 240);
    const maxSteps = 300;
    const lineWidth = stroke.fieldLine / camera.zoom;

    const seedCount = 8;

    for (const m of states) {
      for (let ring = 0; ring < 3; ring++) {
        const r = 0.35 + ring * 0.6;
        for (let i = 0; i < seedCount; i++) {
          const theta = (i / seedCount) * Math.PI * 2 + ring * 0.18;
          const seed: Vec2 = {
            x: m.position.x + Math.cos(theta) * r,
            y: m.position.y + Math.sin(theta) * r,
          };
          this.traceBStreamline(seed, stepSize, maxSteps, states, ec, bounds, lineWidth);
        }
      }
    }
  }

  private traceBStreamline(
    start: Vec2,
    stepSize: number,
    maxSteps: number,
    magnets: readonly MagneticBodyState[],
    ec: ReturnType<typeof emConstants>,
    bounds: { minX: number; minY: number; maxX: number; maxY: number },
    lineWidth: number,
  ): void {
    let x = start.x;
    let y = start.y;
    const points: number[] = [x, y];
    const startX = x;
    const startY = y;

    for (let step = 0; step < maxSteps; step++) {
      const g = sampleGradB({ x, y }, magnets, ec);
      const m = Math.hypot(g.x, g.y);
      if (m < 1e-6) break;
      // Tangent to level curve = perpendicular to gradient, rotated 90°.
      const tx = -g.y / m;
      const ty = g.x / m;

      const midX = x + tx * stepSize * 0.5;
      const midY = y + ty * stepSize * 0.5;
      const g2 = sampleGradB({ x: midX, y: midY }, magnets, ec);
      const m2 = Math.hypot(g2.x, g2.y);
      if (m2 < 1e-6) break;
      const ux = -g2.y / m2;
      const uy = g2.x / m2;

      x += ux * stepSize;
      y += uy * stepSize;

      if (
        x < bounds.minX ||
        x > bounds.maxX ||
        y < bounds.minY ||
        y > bounds.maxY
      ) {
        points.push(x, y);
        break;
      }

      points.push(x, y);

      // Closed-loop early exit: returned near start after some travel.
      if (
        step > 16 &&
        Math.hypot(x - startX, y - startY) < stepSize * 1.2
      ) {
        points.push(startX, startY);
        break;
      }
    }

    if (points.length < 4) return;

    this.bGraphics.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      this.bGraphics.lineTo(points[i], points[i + 1]);
    }
    this.bGraphics.stroke({
      color: palette.fieldB,
      width: lineWidth,
      alpha: 0.5,
    });
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
