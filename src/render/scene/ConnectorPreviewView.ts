import { Container, Graphics } from "pixi.js";
import { PULLEY_DEFAULT_HALF_SPREAD, type Vec2 } from "../../simulation";
import { drawApproxCircle } from "../approxCircle";
import { palette, stroke } from "../style/palette";

/** Two-click connectors (rope / hinge / spring / belt / bar). */
export interface ConnectorPreviewLinearState {
  readonly kind: "rope" | "hinge" | "spring" | "belt" | "bar";
  readonly a: Vec2;
  /** End point. May equal `a` when the user hasn't moved yet. */
  readonly b: Vec2;
  /** True when the live cursor is over a dynamic body — endpoint will snap. */
  readonly snapping?: boolean;
}

/** Pulley — tap wheel center, then body A, then body B. */
export interface ConnectorPreviewPulleyCenterState {
  readonly kind: "pulley-center";
  readonly center: Vec2;
  readonly cursor: Vec2;
  readonly snapping?: boolean;
}

export interface ConnectorPreviewPulleyBodyAState {
  readonly kind: "pulley-body-a";
  readonly center: Vec2;
  readonly anchorA: Vec2;
  readonly cursor: Vec2;
  readonly snapping?: boolean;
}

export type ConnectorPreviewState =
  | ConnectorPreviewLinearState
  | ConnectorPreviewPulleyCenterState
  | ConnectorPreviewPulleyBodyAState;

/**
 * Lightweight overlay for the connector placement gesture.
 *
 * Draws anchor A as a small filled dot and a thin dashed line out to
 * the cursor (or anchor B). Material-honest: subdued ink color, low
 * alpha, ≤1px stroke at zoom 1 — matches the field-line aesthetic in
 * `VISUAL_GUIDELINES.md`. The view never reads from the simulation; it
 * is reset to null whenever the gesture clears.
 */
export class ConnectorPreviewView {
  readonly node = new Container();
  private readonly g = new Graphics();
  private state: ConnectorPreviewState | null = null;

  constructor(private readonly cameraZoomGetter: () => number) {
    this.node.addChild(this.g);
  }

  set(state: ConnectorPreviewState | null): void {
    this.state = state;
    this.draw();
  }

  redraw(): void {
    this.draw();
  }

  clear(): void {
    this.state = null;
    this.g.clear();
  }

  private draw(): void {
    this.g.clear();
    const s = this.state;
    if (!s) return;

    const zoom = this.cameraZoomGetter();
    const lineWidth = stroke.fieldLine / zoom;
    const dotR = 4 / zoom;

    if (s.kind === "pulley-center") {
      drawDashedSegment(this.g, s.center.x, s.center.y, s.cursor.x, s.cursor.y);
      this.g.stroke({ width: lineWidth, color: palette.inkPrimary, alpha: 0.55 });

      const rim = PULLEY_DEFAULT_HALF_SPREAD * 1.05;
      drawApproxCircle(this.g, s.center.x, s.center.y, rim, zoom);
      this.g.stroke({ width: lineWidth, color: palette.inkMuted, alpha: 0.65 });

      drawApproxCircle(this.g, s.center.x, s.center.y, dotR * 0.9, zoom);
      this.g.fill({ color: palette.inkPrimary, alpha: 0.75 });

      drawApproxCircle(this.g, s.cursor.x, s.cursor.y, dotR * (s.snapping ? 1.2 : 0.9), zoom);
      this.g.fill({
        color: palette.inkPrimary,
        alpha: s.snapping ? 0.85 : 0.55,
      });
      return;
    }

    if (s.kind === "pulley-body-a") {
      const rim = PULLEY_DEFAULT_HALF_SPREAD * 1.05;
      drawApproxCircle(this.g, s.center.x, s.center.y, rim, zoom);
      this.g.stroke({ width: lineWidth, color: palette.inkMuted, alpha: 0.65 });

      drawDashedSegment(this.g, s.center.x, s.center.y, s.anchorA.x, s.anchorA.y);
      this.g.stroke({ width: lineWidth, color: palette.inkPrimary, alpha: 0.45 });

      drawDashedSegment(this.g, s.anchorA.x, s.anchorA.y, s.cursor.x, s.cursor.y);
      this.g.stroke({ width: lineWidth, color: palette.inkPrimary, alpha: 0.55 });

      drawApproxCircle(this.g, s.anchorA.x, s.anchorA.y, dotR, zoom);
      this.g.fill({ color: palette.inkPrimary, alpha: 0.75 });

      drawApproxCircle(
        this.g,
        s.cursor.x,
        s.cursor.y,
        dotR * (s.snapping ? 1.2 : 0.9),
        zoom,
      );
      this.g.fill({
        color: palette.inkPrimary,
        alpha: s.snapping ? 0.85 : 0.55,
      });
      return;
    }

    const dx = s.b.x - s.a.x;
    const dy = s.b.y - s.a.y;
    const len = Math.hypot(dx, dy);

    if (len > 1e-4) {
      drawDashedSegment(this.g, s.a.x, s.a.y, s.b.x, s.b.y);
      this.g.stroke({ width: lineWidth, color: palette.inkPrimary, alpha: 0.55 });
    }

    drawApproxCircle(this.g, s.a.x, s.a.y, dotR, zoom);
    this.g.fill({ color: palette.inkPrimary, alpha: 0.75 });

    if (len > 1e-4) {
      drawApproxCircle(
        this.g,
        s.b.x,
        s.b.y,
        dotR * (s.snapping ? 1.2 : 0.9),
        zoom,
      );
      this.g.fill({
        color: palette.inkPrimary,
        alpha: s.snapping ? 0.85 : 0.55,
      });
      if (s.snapping) {
        drawApproxCircle(this.g, s.b.x, s.b.y, dotR * 1.9, zoom);
        this.g.stroke({
          width: lineWidth,
          color: palette.inkPrimary,
          alpha: 0.45,
        });
      }
    }
  }
}

function drawDashedSegment(
  g: Graphics,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): void {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) return;
  const ux = dx / len;
  const uy = dy / len;
  const dash = 0.18;
  const gap = 0.12;
  let cursor = 0;
  while (cursor < len) {
    const next = Math.min(cursor + dash, len);
    const x0 = ax + ux * cursor;
    const y0 = ay + uy * cursor;
    const x1 = ax + ux * next;
    const y1 = ay + uy * next;
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    cursor = next + gap;
  }
}
