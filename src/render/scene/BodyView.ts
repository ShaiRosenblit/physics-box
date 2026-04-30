import { Container, Graphics } from "pixi.js";
import type { BodyView, Id, Snapshot } from "../../simulation";
import { materialStyles, opacity, palette, stroke } from "../style/palette";

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

/**
 * Draws a soft accent ring around the currently-selected body.
 *
 * Lives in `worldRoot` so the ring transforms with the camera. The
 * stroke width is divided by `cameraZoom` so it stays at the same
 * pixel thickness regardless of zoom level.
 */
export class SelectionView {
  readonly node = new Graphics();
  private currentId: Id | null = null;

  constructor(private readonly cameraZoomGetter: () => number) {}

  setSelectedId(id: Id | null): void {
    this.currentId = id;
  }

  /** Recompute the ring geometry from the latest snapshot. */
  update(snapshot: Snapshot): void {
    this.node.clear();
    if (this.currentId === null) return;
    const body = snapshot.bodies.find((b) => b.id === this.currentId);
    if (!body) return;

    const zoom = Math.max(this.cameraZoomGetter(), 1e-3);
    const lineWidth = (stroke.selection + 0.6) / zoom;
    const inset = 4 / zoom; // small visual gap between body and ring

    this.node.position.set(body.position.x, body.position.y);
    this.node.rotation = body.angle;

    if (body.kind === "ball" || body.kind === "magnet") {
      this.node.circle(0, 0, body.radius + inset);
      this.node.stroke({
        width: lineWidth,
        color: palette.fieldB,
        alpha: 0.95,
      });
      this.node.circle(0, 0, body.radius + inset);
      this.node.stroke({
        width: lineWidth * 2.6,
        color: palette.fieldB,
        alpha: opacity.selection,
      });
    } else {
      const hw = body.width / 2 + inset;
      const hh = body.height / 2 + inset;
      this.node.rect(-hw, -hh, hw * 2, hh * 2);
      this.node.stroke({
        width: lineWidth,
        color: palette.fieldB,
        alpha: 0.95,
      });
      this.node.rect(-hw, -hh, hw * 2, hh * 2);
      this.node.stroke({
        width: lineWidth * 2.6,
        color: palette.fieldB,
        alpha: opacity.selection,
      });
    }
  }

  clear(): void {
    this.currentId = null;
    this.node.clear();
  }
}

function drawBody(body: BodyView, cameraZoom: number): Graphics {
  const g = new Graphics();
  const lineWidth = stroke.bodyOutline / cameraZoom;
  const style = body.fixed
    ? { fill: palette.paperShade, edge: palette.inkMuted }
    : materialStyles[body.material];

  if (body.kind === "ball") {
    g.circle(0, -0.04, body.radius);
    g.fill({ color: 0x2a2520, alpha: 0.1 });
    g.circle(0, 0, body.radius);
    g.fill({ color: style.fill, alpha: 1 });
    g.stroke({ width: lineWidth, color: style.edge, alpha: 0.9 });
    drawHighlight(g, body.material, body.radius);
    const tickLen = body.radius * 0.55;
    g.moveTo(0, 0);
    g.lineTo(tickLen, 0);
    g.stroke({ width: lineWidth * 0.8, color: style.edge, alpha: 0.45 });
    drawChargeMark(g, body.charge, body.radius, lineWidth);
  } else if (body.kind === "magnet") {
    g.circle(0, -0.04, body.radius);
    g.fill({ color: 0x2a2520, alpha: 0.1 });
    drawMagnet(g, body.radius, body.dipole, lineWidth, style);
  } else {
    const hw = body.width / 2;
    const hh = body.height / 2;
    g.rect(-hw, -hh - 0.04, body.width, body.height);
    g.fill({ color: 0x2a2520, alpha: 0.08 });
    g.rect(-hw, -hh, body.width, body.height);
    g.fill({ color: style.fill, alpha: 1 });
    g.stroke({ width: lineWidth, color: style.edge, alpha: 0.9 });
    drawBoxGrain(g, body.material, hw, hh);
  }

  return g;
}

function drawHighlight(
  g: Graphics,
  material: BodyView["material"],
  radius: number,
): void {
  const offset = radius * 0.32;
  const r = radius * 0.55;
  const alpha = material === "metal" ? 0.32 : material === "cork" ? 0.14 : 0.18;
  g.circle(-offset, offset, r);
  g.fill({ color: 0xfff4e3, alpha });
}

function drawBoxGrain(
  g: Graphics,
  material: BodyView["material"],
  hw: number,
  hh: number,
): void {
  if (material !== "wood") return;
  const grainColor = palette.woodGrain;
  const lines = 3;
  for (let i = 1; i <= lines; i++) {
    const y = -hh + (i / (lines + 1)) * (hh * 2);
    g.moveTo(-hw * 0.85, y);
    g.lineTo(hw * 0.85, y);
    g.stroke({ width: 0.01, color: grainColor, alpha: 0.18 });
  }
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
