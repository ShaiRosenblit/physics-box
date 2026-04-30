import { Container, Graphics } from "pixi.js";
import type { BodyView, ConstraintView, Id, Snapshot } from "../../simulation";
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
 *
 * Ropes and springs stay behind bodies so segments can read as passing
 * behind hulls. Hinges render in front: spaced spokes from the pivot to
 * each hull (the revolute point can sit outside a box), then the hub on top.
 */
export class ConstraintLayer {
  readonly behindBodies = new Container();
  readonly inFrontOfBodies = new Container();
  private readonly entries = new Map<Id, ConstraintEntry>();

  constructor(private readonly cameraZoomGetter: () => number) {}

  reconcile(snapshot: Snapshot): void {
    const seen = new Set<Id>();
    const zoom = this.cameraZoomGetter();

    for (const view of snapshot.constraints) {
      seen.add(view.id);
      let entry = this.entries.get(view.id);
      const parent = view.kind === "hinge" ? this.inFrontOfBodies : this.behindBodies;
      if (!entry || entry.kind !== view.kind) {
        if (entry) {
          entry.node.parent?.removeChild(entry.node);
          entry.node.destroy();
        }
        const node = new Graphics();
        parent.addChild(node);
        entry = { node, kind: view.kind };
        this.entries.set(view.id, entry);
      } else if (entry.node.parent !== parent) {
        entry.node.parent?.removeChild(entry.node);
        parent.addChild(entry.node);
      }
      drawConstraint(entry.node, view, zoom, snapshot);
    }

    for (const [id, entry] of this.entries) {
      if (seen.has(id)) continue;
      entry.node.parent?.removeChild(entry.node);
      entry.node.destroy();
      this.entries.delete(id);
    }
  }

  clear(): void {
    for (const [, entry] of this.entries) {
      entry.node.parent?.removeChild(entry.node);
      entry.node.destroy();
    }
    this.entries.clear();
  }
}

function drawConstraint(
  g: Graphics,
  view: ConstraintView,
  zoom: number,
  snapshot: Snapshot,
): void {
  g.clear();
  if (view.kind === "rope") {
    drawRope(g, view, zoom);
    return;
  }
  if (view.kind === "hinge") {
    drawHinge(g, view, zoom, snapshot);
    return;
  }
  if (view.kind === "spring") {
    drawSpring(g, view, zoom);
    return;
  }
  if (view.kind === "pulley") {
    drawPulley(g, view, zoom);
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

function closestPointOnBodyHull(body: BodyView, p: { x: number; y: number }): {
  x: number;
  y: number;
} {
  if (body.kind === "ball" || body.kind === "magnet") {
    const dx = p.x - body.position.x;
    const dy = p.y - body.position.y;
    const len = Math.hypot(dx, dy);
    const r = body.radius;
    if (len < 1e-9) {
      return { x: body.position.x + r, y: body.position.y };
    }
    return {
      x: body.position.x + (dx / len) * r,
      y: body.position.y + (dy / len) * r,
    };
  }
  const hw = body.width / 2;
  const hh = body.height / 2;
  const c = Math.cos(body.angle);
  const s = Math.sin(body.angle);
  const dx = p.x - body.position.x;
  const dy = p.y - body.position.y;
  const lx = c * dx + s * dy;
  const ly = -s * dx + c * dy;
  const qlx = Math.max(-hw, Math.min(hw, lx));
  const qly = Math.max(-hh, Math.min(hh, ly));
  return {
    x: body.position.x + c * qlx - s * qly,
    y: body.position.y + s * qlx + c * qly,
  };
}

function drawHinge(
  g: Graphics,
  view: Extract<ConstraintView, { kind: "hinge" }>,
  zoom: number,
  snapshot: Snapshot,
): void {
  const { x: ax, y: ay } = view.anchor;
  const lineW = (stroke.bodyOutline * 0.95) / zoom;
  const minLimb = 1.2e-3;

  const strokeLimb = (x0: number, y0: number, x1: number, y1: number) => {
    if (Math.hypot(x1 - x0, y1 - y0) < minLimb) return;
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke({ width: lineW, color: palette.metalEdge, alpha: 0.84 });
  };

  const bodyA = snapshot.bodies.find((b) => b.id === view.bodyA);
  if (bodyA) {
    const pa = closestPointOnBodyHull(bodyA, view.anchor);
    strokeLimb(pa.x, pa.y, ax, ay);
  }
  if (view.bodyB !== undefined) {
    const bodyB = snapshot.bodies.find((b) => b.id === view.bodyB);
    if (bodyB) {
      const pb = closestPointOnBodyHull(bodyB, view.anchor);
      strokeLimb(ax, ay, pb.x, pb.y);
    }
  }

  const r = 6 / zoom;
  const hubW = stroke.bodyOutline / zoom;
  g.circle(ax, ay, r)
    .fill({ color: palette.metal, alpha: 1 })
    .stroke({ width: hubW, color: palette.metalEdge, alpha: 0.9 });
  g.circle(ax, ay, r * 0.35).fill({ color: palette.inkPrimary, alpha: 0.6 });
}

function drawPulley(
  g: Graphics,
  view: Extract<ConstraintView, { kind: "pulley" }>,
  zoom: number,
): void {
  const lineWidth = (stroke.bodyOutline * 1.15) / zoom;
  const strand = palette.metalEdge;

  const strokeStrand = (ax: number, ay: number, bx: number, by: number) => {
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.stroke({ width: lineWidth, color: strand, alpha: 0.82 });
  };

  strokeStrand(view.anchorA.x, view.anchorA.y, view.groundA.x, view.groundA.y);
  strokeStrand(view.anchorB.x, view.anchorB.y, view.groundB.x, view.groundB.y);

  const cx = view.wheelCenter.x;
  const cy = view.wheelCenter.y;
  const rim = Math.max(view.halfSpread * 1.05, 0.06);
  g.circle(cx, cy, rim);
  g.stroke({ width: stroke.bodyOutline / zoom, color: palette.metalEdge, alpha: 0.88 });
  g.fill({ color: palette.metal, alpha: 0.35 });

  const hub = rim * 0.35;
  g.circle(cx, cy, hub);
  g.fill({ color: palette.inkPrimary, alpha: 0.45 });
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
