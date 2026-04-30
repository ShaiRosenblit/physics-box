import { Container, Graphics } from "pixi.js";
import type { Vec2 } from "../../simulation";
import { palette, stroke } from "../style/palette";

export type ConnectorPreviewKind = "rope" | "hinge" | "spring";

export interface ConnectorPreviewState {
  readonly kind: ConnectorPreviewKind;
  readonly a: Vec2;
  /** End point. May equal `a` when the user hasn't moved yet. */
  readonly b: Vec2;
  /** True when the live cursor is over a dynamic body — endpoint will snap. */
  readonly snapping?: boolean;
}

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
    const dx = s.b.x - s.a.x;
    const dy = s.b.y - s.a.y;
    const len = Math.hypot(dx, dy);

    if (len > 1e-4) {
      const ux = dx / len;
      const uy = dy / len;
      const dash = 0.18;
      const gap = 0.12;
      let cursor = 0;
      while (cursor < len) {
        const next = Math.min(cursor + dash, len);
        const x0 = s.a.x + ux * cursor;
        const y0 = s.a.y + uy * cursor;
        const x1 = s.a.x + ux * next;
        const y1 = s.a.y + uy * next;
        this.g.moveTo(x0, y0);
        this.g.lineTo(x1, y1);
        cursor = next + gap;
      }
      this.g.stroke({ width: lineWidth, color: palette.inkPrimary, alpha: 0.55 });
    }

    this.g.circle(s.a.x, s.a.y, dotR);
    this.g.fill({ color: palette.inkPrimary, alpha: 0.75 });

    if (len > 1e-4) {
      this.g.circle(s.b.x, s.b.y, dotR * (s.snapping ? 1.2 : 0.9));
      this.g.fill({
        color: palette.inkPrimary,
        alpha: s.snapping ? 0.85 : 0.55,
      });
      if (s.snapping) {
        this.g.circle(s.b.x, s.b.y, dotR * 1.9);
        this.g.stroke({
          width: lineWidth,
          color: palette.inkPrimary,
          alpha: 0.45,
        });
      }
    }
  }
}
