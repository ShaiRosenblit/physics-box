import { Container, Graphics } from "pixi.js";
import type { BodyView, Id, Snapshot } from "../../simulation";
import { materialStyles, palette, stroke } from "../style/palette";

interface BodyEntry {
  readonly node: Graphics;
  readonly kind: BodyView["kind"];
  readonly material: BodyView["material"];
  readonly chargeSign: -1 | 0 | 1;
  readonly dipoleSign: -1 | 0 | 1;
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
      const sign = signOf(body.charge);
      const dSign = body.kind === "magnet" ? signOf(body.dipole) : 0;
      let entry = this.entries.get(body.id);
      if (
        !entry ||
        entry.kind !== body.kind ||
        entry.material !== body.material ||
        entry.chargeSign !== sign ||
        entry.dipoleSign !== dSign
      ) {
        if (entry) {
          this.node.removeChild(entry.node);
          entry.node.destroy();
        }
        const node = drawBody(body, this.cameraZoomGetter());
        this.node.addChild(node);
        entry = {
          node,
          kind: body.kind,
          material: body.material,
          chargeSign: sign,
          dipoleSign: dSign,
        };
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
    drawChargeMark(g, body.charge, body.radius, lineWidth);
  } else if (body.kind === "magnet") {
    drawMagnet(g, body.radius, body.dipole, lineWidth, style);
  } else {
    const hw = body.width / 2;
    const hh = body.height / 2;
    g.rect(-hw, -hh, body.width, body.height);
    g.fill({ color: style.fill, alpha: 1 });
    g.stroke({ width: lineWidth, color: style.edge, alpha: 0.9 });
  }

  return g;
}

function signOf(q: number): -1 | 0 | 1 {
  if (q > 0) return 1;
  if (q < 0) return -1;
  return 0;
}

function drawMagnet(
  g: Graphics,
  radius: number,
  dipole: number,
  lineWidth: number,
  style: { fill: number; edge: number },
): void {
  const top = dipole >= 0 ? palette.magnetN : palette.magnetS;
  const bot = dipole >= 0 ? palette.magnetS : palette.magnetN;
  // Body disc background
  g.circle(0, 0, radius);
  g.fill({ color: style.fill, alpha: 1 });
  g.stroke({ width: lineWidth, color: style.edge, alpha: 0.9 });
  // Top half (north)
  g.beginPath();
  g.arc(0, 0, radius * 0.78, 0, Math.PI, false);
  g.lineTo(-radius * 0.78, 0);
  g.fill({ color: top, alpha: 0.9 });
  // Bottom half (south)
  g.beginPath();
  g.arc(0, 0, radius * 0.78, Math.PI, Math.PI * 2, false);
  g.lineTo(radius * 0.78, 0);
  g.fill({ color: bot, alpha: 0.9 });
  // Equator stroke
  g.moveTo(-radius * 0.78, 0);
  g.lineTo(radius * 0.78, 0);
  g.stroke({ width: lineWidth * 0.8, color: style.edge, alpha: 0.6 });
}

function drawChargeMark(
  g: Graphics,
  charge: number,
  radius: number,
  lineWidth: number,
): void {
  if (charge === 0) return;
  const color = charge > 0 ? palette.chargePos : palette.chargeNeg;
  g.circle(0, 0, radius * 1.05);
  g.stroke({ width: lineWidth * 1.2, color, alpha: 0.8 });
  const armLen = radius * 0.45;
  g.moveTo(-armLen, 0);
  g.lineTo(armLen, 0);
  g.stroke({ width: lineWidth * 1.4, color, alpha: 0.95 });
  if (charge > 0) {
    g.moveTo(0, -armLen);
    g.lineTo(0, armLen);
    g.stroke({ width: lineWidth * 1.4, color, alpha: 0.95 });
  }
}
