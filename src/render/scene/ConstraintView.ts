import { Container, Graphics } from "pixi.js";
import type { ConstraintView, Id, Snapshot } from "../../simulation";
import { materialStyles, palette, stroke } from "../style/palette";

interface ConstraintEntry {
  readonly node: Graphics;
  readonly kind: ConstraintView["kind"];
}

/**
 * Reconciles per-id Graphics for ropes, hinges, and springs.
 * Geometry is redrawn each frame because constraint shape generally
 * depends on body positions; the shapes are simple polylines / arcs
 * so the per-frame cost is small.
 */
export class ConstraintLayer {
  readonly node = new Container();
  private readonly entries = new Map<Id, ConstraintEntry>();

  constructor(private readonly cameraZoomGetter: () => number) {}

  reconcile(snapshot: Snapshot): void {
    const seen = new Set<Id>();
    const zoom = this.cameraZoomGetter();

    for (const view of snapshot.constraints) {
      seen.add(view.id);
      let entry = this.entries.get(view.id);
      if (!entry || entry.kind !== view.kind) {
        if (entry) {
          this.node.removeChild(entry.node);
          entry.node.destroy();
        }
        const node = new Graphics();
        this.node.addChild(node);
        entry = { node, kind: view.kind };
        this.entries.set(view.id, entry);
      }
      drawConstraint(entry.node, view, zoom);
    }

    for (const [id, entry] of this.entries) {
      if (seen.has(id)) continue;
      this.node.removeChild(entry.node);
      entry.node.destroy();
      this.entries.delete(id);
    }
  }

  clear(): void {
    for (const [, entry] of this.entries) {
      this.node.removeChild(entry.node);
      entry.node.destroy();
    }
    this.entries.clear();
  }
}

function drawConstraint(g: Graphics, view: ConstraintView, zoom: number): void {
  g.clear();
  if (view.kind === "rope") {
    drawRope(g, view, zoom);
    return;
  }
  if (view.kind === "hinge") {
    drawHinge(g, view, zoom);
    return;
  }
  if (view.kind === "spring") {
    drawSpring(g, view, zoom);
  }
}

function drawRope(
  g: Graphics,
  view: Extract<ConstraintView, { kind: "rope" }>,
  zoom: number,
): void {
  if (view.path.length < 2) return;
  const style = materialStyles[view.material];
  const lineWidth = (stroke.bodyOutline * 1.2) / zoom;
  g.moveTo(view.path[0].x, view.path[0].y);
  for (let i = 1; i < view.path.length; i++) {
    g.lineTo(view.path[i].x, view.path[i].y);
  }
  g.stroke({ width: lineWidth, color: style.edge, alpha: 0.85 });
}

function drawHinge(
  g: Graphics,
  view: Extract<ConstraintView, { kind: "hinge" }>,
  zoom: number,
): void {
  const r = 6 / zoom;
  g.circle(view.anchor.x, view.anchor.y, r);
  g.fill({ color: palette.metal, alpha: 1 });
  g.stroke({ width: stroke.bodyOutline / zoom, color: palette.metalEdge, alpha: 0.9 });
  g.circle(view.anchor.x, view.anchor.y, r * 0.35);
  g.fill({ color: palette.inkPrimary, alpha: 0.6 });
}

function drawSpring(
  g: Graphics,
  view: Extract<ConstraintView, { kind: "spring" }>,
  zoom: number,
): void {
  const ax = view.a.x;
  const ay = view.a.y;
  const bx = view.b.x;
  const by = view.b.y;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const coils = 10;
  const amp = Math.min(0.12, view.restLength * 0.12);
  const lineWidth = stroke.bodyOutline / zoom;

  g.moveTo(ax, ay);
  const inset = 0.08;
  g.lineTo(ax + ux * inset, ay + uy * inset);
  for (let i = 1; i <= coils; i++) {
    const t = (i - 0.5) / coils;
    const cx = ax + ux * (inset + t * (len - 2 * inset));
    const cy = ay + uy * (inset + t * (len - 2 * inset));
    const sign = i % 2 === 0 ? 1 : -1;
    g.lineTo(cx + nx * amp * sign, cy + ny * amp * sign);
  }
  g.lineTo(bx - ux * inset, by - uy * inset);
  g.lineTo(bx, by);
  g.stroke({ width: lineWidth, color: palette.metalEdge, alpha: 0.85 });
}
