import { Container, Graphics } from "pixi.js";
import type { BodyView, Id, Snapshot } from "../../simulation";
import { materialStyles, palette, stroke } from "../style/palette";

interface BodyEntry {
  readonly node: Graphics;
  readonly kind: BodyView["kind"];
  readonly material: BodyView["material"];
}

/**
 * Reconciles per-body Graphics with a Snapshot.
 *
 * Adds, removes, and transforms body display objects by id. Geometry
 * is drawn once at creation; per-frame work is just position/rotation
 * and the transient set diff.
 */
export class BodyLayer {
  readonly node = new Container();
  private readonly entries = new Map<Id, BodyEntry>();

  constructor(private readonly cameraZoomGetter: () => number) {}

  reconcile(snapshot: Snapshot): void {
    const seen = new Set<Id>();

    for (const body of snapshot.bodies) {
      seen.add(body.id);
      let entry = this.entries.get(body.id);
      if (!entry || entry.kind !== body.kind || entry.material !== body.material) {
        if (entry) {
          this.node.removeChild(entry.node);
          entry.node.destroy();
        }
        const node = drawBody(body, this.cameraZoomGetter());
        this.node.addChild(node);
        entry = { node, kind: body.kind, material: body.material };
        this.entries.set(body.id, entry);
      }
      entry.node.position.set(body.position.x, body.position.y);
      entry.node.rotation = body.angle;
    }

    for (const [id, entry] of this.entries) {
      if (seen.has(id)) continue;
      this.node.removeChild(entry.node);
      entry.node.destroy();
      this.entries.delete(id);
    }
  }

  /** Forces a redraw of all body geometry — call after camera zoom changes. */
  refreshGeometry(snapshot: Snapshot): void {
    for (const [, entry] of this.entries) {
      this.node.removeChild(entry.node);
      entry.node.destroy();
    }
    this.entries.clear();
    this.reconcile(snapshot);
  }

  clear(): void {
    for (const [, entry] of this.entries) {
      this.node.removeChild(entry.node);
      entry.node.destroy();
    }
    this.entries.clear();
  }
}

function drawBody(body: BodyView, cameraZoom: number): Graphics {
  const g = new Graphics();
  const lineWidth = stroke.bodyOutline / cameraZoom;
  const style = body.fixed
    ? { fill: palette.paperShade, edge: palette.inkMuted }
    : materialStyles[body.material];

  if (body.kind === "ball") {
    g.circle(0, 0, body.radius);
    g.fill({ color: style.fill, alpha: 1 });
    g.stroke({ width: lineWidth, color: style.edge, alpha: 0.9 });
    const tickLen = body.radius * 0.55;
    g.moveTo(0, 0);
    g.lineTo(tickLen, 0);
    g.stroke({ width: lineWidth * 0.8, color: style.edge, alpha: 0.45 });
  } else {
    const hw = body.width / 2;
    const hh = body.height / 2;
    g.rect(-hw, -hh, body.width, body.height);
    g.fill({ color: style.fill, alpha: 1 });
    g.stroke({ width: lineWidth, color: style.edge, alpha: 0.9 });
  }

  return g;
}
