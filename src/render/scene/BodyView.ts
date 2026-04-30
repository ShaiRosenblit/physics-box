import {
  Container,
  Graphics,
  NineSliceSprite,
  Sprite,
  type Texture,
} from "pixi.js";
import type { BodyView, Id, Snapshot } from "../../simulation";
import { materialStyles, opacity, palette, stroke } from "../style/palette";

/** PNG-driven body looks; optional until `BodyLayer.setRasterTextures` runs. */
export interface RasterBodyTextures {
  readonly woodBox?: Texture;
  readonly woodBall?: Texture;
}

/** 128² nine-slice PNG: keep outer ~25% as fixed corners/bracing. */
const WOOD_BOX_SLICE = 32;

/**
 * Below this size (world units), nine-slice wood boxes collapse visually —
 * the fixed top/bottom caps consume almost all height, so the plank
 * disappears while outlines and overlays (e.g. hinge markers) remain.
 */
const MIN_WOOD_BOX_NINESLICE_DIM = 0.22;

/**
 * Long thin strips (low min / max side ratio) also break nine-slice; use
 * procedural wood so seesaw planks and similar stay visible.
 */
const MIN_WOOD_BOX_NINESLICE_ASPECT = 0.26;

/** World-space coil polyline — stay aligned with spring hit-testing (`constraintHit`). */
function springOutlineWorld(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  restLength: number,
): Array<{ readonly x: number; readonly y: number }> {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return [{ x: ax, y: ay }, { x: bx, y: by }];
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const coils = 10;
  const amp = Math.min(0.12, restLength * 0.12);
  const inset = 0.08;
  const out: Array<{ x: number; y: number }> = [];
  out.push({ x: ax, y: ay });
  out.push({ x: ax + ux * inset, y: ay + uy * inset });
  for (let i = 1; i <= coils; i++) {
    const t = (i - 0.5) / coils;
    const cx = ax + ux * (inset + t * (len - 2 * inset));
    const cy = ay + uy * (inset + t * (len - 2 * inset));
    const sign = i % 2 === 0 ? 1 : -1;
    out.push({ x: cx + nx * amp * sign, y: cy + ny * amp * sign });
  }
  out.push({ x: bx - ux * inset, y: by - uy * inset });
  out.push({ x: bx, y: by });
  return out;
}

interface BodyEntry {
  readonly node: Container;
  readonly styleKey: string;
}

/**
 * Reconciles per-body display nodes with a Snapshot.
 *
 * Wood boxes and wooden balls may use workshop PNGs when raster textures
 * are configured; other bodies stay procedural Graphics.
 */
export class BodyLayer {
  readonly node = new Container();
  private readonly entries = new Map<Id, BodyEntry>();
  private rasterTextures: RasterBodyTextures = {};

  constructor(private readonly cameraZoomGetter: () => number) {}

  /**
   * Enables PNG materials for wood boxes (non-fixed) and wood balls.
   * Call before the first `render` once assets are loaded.
   */
  setRasterTextures(textures: RasterBodyTextures): void {
    this.rasterTextures = textures;
  }

  reconcile(snapshot: Snapshot): void {
    const seen = new Set<Id>();

    for (const body of snapshot.bodies) {
      seen.add(body.id);
      const styleKey = bodyStyleKey(body, this.rasterTextures);
      let entry = this.entries.get(body.id);
      if (!entry || entry.styleKey !== styleKey) {
        if (entry) {
          this.node.removeChild(entry.node);
          entry.node.destroy();
        }
        const node = createBodyNode(
          body,
          this.cameraZoomGetter(),
          this.rasterTextures,
        );
        this.node.addChild(node);
        entry = { node, styleKey };
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

function woodBoxUseNineSlice(
  body: Extract<BodyView, { kind: "box" }>,
  raster: RasterBodyTextures,
): boolean {
  if (
    body.material !== "wood" ||
    body.fixed ||
    raster.woodBox === undefined
  ) {
    return false;
  }
  const minD = Math.min(body.width, body.height);
  const maxD = Math.max(body.width, body.height);
  if (minD < MIN_WOOD_BOX_NINESLICE_DIM) return false;
  if (minD < MIN_WOOD_BOX_NINESLICE_ASPECT * maxD) return false;
  return true;
}

function bodyStyleKey(body: BodyView, raster: RasterBodyTextures): string {
  const sign = signOf(body.charge);
  const dSign = body.kind === "magnet" ? signOf(body.dipole) : 0;
  const tSign = body.kind === "engine" ? signOf(body.torque) : 0;
  const woodBox =
    body.kind === "box" && woodBoxUseNineSlice(body, raster);
  const woodBall =
    body.kind === "ball" &&
    body.material === "wood" &&
    raster.woodBall !== undefined;
  return `${body.kind}:${body.material}:${body.fixed ? "1" : "0"}:${sign}:${dSign}:${tSign}:${woodBox ? "Wb" : "-"}:${woodBall ? "Wl" : "-"}`;
}

function createBodyNode(
  body: BodyView,
  cameraZoom: number,
  raster: RasterBodyTextures,
): Container {
  if (body.kind === "box" && woodBoxUseNineSlice(body, raster)) {
    return wrapRasterWoodBox(body, cameraZoom, raster.woodBox!);
  }
  if (body.kind === "ball" && body.material === "wood" && raster.woodBall) {
    return wrapRasterWoodBall(body, cameraZoom, raster.woodBall);
  }

  const g = buildProceduralBody(body, cameraZoom);
  const c = new Container();
  c.addChild(g);
  return c;
}

function wrapRasterWoodBox(
  body: Extract<BodyView, { kind: "box" }>,
  cameraZoom: number,
  texture: Texture,
): Container {
  const c = new Container();
  const slice = new NineSliceSprite({
    texture,
    leftWidth: WOOD_BOX_SLICE,
    rightWidth: WOOD_BOX_SLICE,
    topHeight: WOOD_BOX_SLICE,
    bottomHeight: WOOD_BOX_SLICE,
    width: body.width,
    height: body.height,
    anchor: 0.5,
  });

  slice.tint = palette.wood;

  const lineWidth = stroke.bodyOutline / cameraZoom;
  const g = new Graphics();
  const hw = body.width / 2;
  const hh = body.height / 2;
  g.rect(-hw, -hh, body.width, body.height);
  g.stroke({
    width: lineWidth,
    color: palette.woodGrain,
    alpha: 0.85,
  });

  c.addChild(slice);
  c.addChild(g);
  return c;
}

function wrapRasterWoodBall(
  body: Extract<BodyView, { kind: "ball" }>,
  cameraZoom: number,
  texture: Texture,
): Container {
  const c = new Container();
  const lineWidth = stroke.bodyOutline / cameraZoom;
  const style = materialStyles.wood;

  const shadow = new Graphics();
  shadow.circle(0, -0.04, body.radius);
  shadow.fill({ color: palette.inkPrimary, alpha: opacity.bodyShadow });

  const spr = new Sprite(texture);
  spr.anchor.set(0.5);
  spr.width = body.radius * 2;
  spr.height = body.radius * 2;
  spr.tint = palette.wood;

  const clip = new Graphics();
  clip.circle(0, 0, body.radius);
  clip.fill({ color: 0xffffff });
  spr.mask = clip;

  const edge = new Graphics();
  edge.circle(0, 0, body.radius);
  edge.stroke({
    width: lineWidth,
    color: style.edge,
    alpha: 0.9,
  });

  const tickLen = body.radius * 0.55;
  const orient = new Graphics();
  orient.moveTo(0, 0);
  orient.lineTo(tickLen, 0);
  orient.stroke({
    width: lineWidth * 0.8,
    color: style.edge,
    alpha: 0.45,
  });

  const chargeOverlay = new Graphics();
  drawChargeMark(chargeOverlay, body.charge, body.radius, lineWidth);

  c.addChild(shadow, spr, clip, edge, orient, chargeOverlay);
  return c;
}

function drawEngineBody(
  g: Graphics,
  body: Extract<BodyView, { kind: "engine" }>,
  lineWidth: number,
  style: { fill: number; edge: number },
): void {
  const hw = body.width / 2;
  const hh = body.height / 2;
  g.rect(-hw, -hh - 0.04, body.width, body.height);
  g.fill({ color: palette.inkPrimary, alpha: opacity.bodyShadow * 0.9 });
  g.rect(-hw, -hh, body.width, body.height);
  g.fill({ color: style.fill, alpha: 1 });
  g.stroke({ width: lineWidth, color: style.edge, alpha: 0.9 });

  const tab = Math.min(hw, hh) * 0.22;
  g.moveTo(hw, -tab);
  g.lineTo(hw + tab * 0.85, -tab);
  g.lineTo(hw + tab * 0.85, tab);
  g.lineTo(hw, tab);
  g.stroke({ width: lineWidth * 0.85, color: style.edge, alpha: 0.72 });

  const rr = Math.min(hw, hh) * 0.5;
  const ccw = body.torque >= 0;
  const a0 = ccw ? 0.12 * Math.PI : -0.12 * Math.PI;
  const a1 = ccw ? a0 - 1.1 * Math.PI : a0 + 1.1 * Math.PI;
  g.arc(0, 0, rr, a0, a1, !ccw);
  g.stroke({
    width: lineWidth * 0.72,
    color: palette.inkMuted,
    alpha: 0.52,
  });

  drawChargeMark(g, body.charge, Math.min(hw, hh), lineWidth);
}

function buildProceduralBody(body: BodyView, cameraZoom: number): Graphics {
  const g = new Graphics();
  const lineWidth = stroke.bodyOutline / cameraZoom;
  const style = body.fixed
    ? { fill: palette.paperShade, edge: palette.inkMuted }
    : materialStyles[body.material];

  if (body.kind === "ball" || body.kind === "balloon") {
    g.circle(0, -0.04, body.radius);
    g.fill({ color: palette.inkPrimary, alpha: opacity.bodyShadow });
    g.circle(0, 0, body.radius);
    const filmAlpha = body.kind === "balloon" ? 0.88 : 1;
    g.fill({ color: style.fill, alpha: filmAlpha });
    g.stroke({ width: lineWidth, color: style.edge, alpha: 0.9 });
    drawHighlight(g, body.material, body.radius, body.kind);
    const tickLen = body.radius * 0.55;
    g.moveTo(0, 0);
    g.lineTo(tickLen, 0);
    g.stroke({ width: lineWidth * 0.8, color: style.edge, alpha: 0.45 });
    drawChargeMark(g, body.charge, body.radius, lineWidth);
  } else if (body.kind === "engine") {
    drawEngineBody(g, body, lineWidth, style);
  } else if (body.kind === "magnet") {
    g.circle(0, -0.04, body.radius);
    g.fill({ color: palette.inkPrimary, alpha: opacity.bodyShadow });
    drawMagnet(g, body.radius, body.dipole, lineWidth, style);
  } else {
    const hw = body.width / 2;
    const hh = body.height / 2;
    g.rect(-hw, -hh - 0.04, body.width, body.height);
    g.fill({ color: palette.inkPrimary, alpha: opacity.bodyShadow * 0.9 });
    g.rect(-hw, -hh, body.width, body.height);
    g.fill({ color: style.fill, alpha: 1 });
    g.stroke({ width: lineWidth, color: style.edge, alpha: 0.9 });
    drawBoxGrain(g, body.material, hw, hh);
  }

  return g;
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

    const zoom = Math.max(this.cameraZoomGetter(), 1e-3);
    const lineWidth = (stroke.selection + 0.6) / zoom;

    const body = snapshot.bodies.find((b) => b.id === this.currentId);
    if (body) {
      const inset = 4 / zoom;
      this.node.position.set(body.position.x, body.position.y);
      this.node.rotation = body.angle;

      if (body.kind === "ball" || body.kind === "balloon" || body.kind === "magnet") {
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
      return;
    }

    const constraint = snapshot.constraints.find((c) => c.id === this.currentId);
    if (!constraint) return;

    this.node.position.set(0, 0);
    this.node.rotation = 0;

    if (constraint.kind === "rope") {
      this.strokeWorldPolyline(constraint.path, lineWidth);
      return;
    }
    if (constraint.kind === "spring") {
      const pts = springOutlineWorld(
        constraint.a.x,
        constraint.a.y,
        constraint.b.x,
        constraint.b.y,
        constraint.restLength,
      );
      this.strokeWorldPolyline(pts, lineWidth);
      return;
    }
    if (constraint.kind === "hinge") {
      const r = 0.065;
      for (let pass = 0; pass < 2; pass++) {
        const w = pass === 0 ? lineWidth : lineWidth * 2.6;
        const a = pass === 0 ? 0.95 : opacity.selection;
        this.node.circle(constraint.anchor.x, constraint.anchor.y, r);
        this.node.stroke({
          width: w,
          color: palette.fieldB,
          alpha: a,
        });
      }
      return;
    }
    if (constraint.kind === "pulley") {
      const rim = Math.max(constraint.halfSpread * 1.05, 0.06);
      for (let pass = 0; pass < 2; pass++) {
        const w = pass === 0 ? lineWidth : lineWidth * 2.6;
        const a = pass === 0 ? 0.95 : opacity.selection;
        this.node.circle(constraint.wheelCenter.x, constraint.wheelCenter.y, rim);
        this.node.stroke({
          width: w,
          color: palette.fieldB,
          alpha: a,
        });
      }
      this.strokeSegment(
        constraint.anchorA.x,
        constraint.anchorA.y,
        constraint.groundA.x,
        constraint.groundA.y,
        lineWidth,
      );
      this.strokeSegment(
        constraint.anchorB.x,
        constraint.anchorB.y,
        constraint.groundB.x,
        constraint.groundB.y,
        lineWidth,
      );
    }
  }

  private strokeWorldPolyline(
    pts: ReadonlyArray<{ readonly x: number; readonly y: number }>,
    lineWidth: number,
  ): void {
    if (pts.length < 2) return;
    for (let pass = 0; pass < 2; pass++) {
      const w = pass === 0 ? lineWidth : lineWidth * 2.6;
      const a = pass === 0 ? 0.95 : opacity.selection;
      this.node.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length; i++) {
        this.node.lineTo(pts[i]!.x, pts[i]!.y);
      }
      this.node.stroke({
        width: w,
        color: palette.fieldB,
        alpha: a,
      });
    }
  }

  private strokeSegment(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    lineWidth: number,
  ): void {
    for (let pass = 0; pass < 2; pass++) {
      const w = pass === 0 ? lineWidth : lineWidth * 2.6;
      const a = pass === 0 ? 0.95 : opacity.selection;
      this.node.moveTo(ax, ay);
      this.node.lineTo(bx, by);
      this.node.stroke({
        width: w,
        color: palette.fieldB,
        alpha: a,
      });
    }
  }

  clear(): void {
    this.currentId = null;
    this.node.clear();
  }
}

function drawHighlight(
  g: Graphics,
  material: BodyView["material"],
  radius: number,
  bodyKind: BodyView["kind"],
): void {
  if (bodyKind === "balloon") return;
  const offset = radius * 0.32;
  const r = radius * 0.55;
  const alpha =
    material === "metal"
      ? 0.32
      : material === "cork"
        ? 0.14
        : material === "felt"
          ? 0.11
          : material === "latex"
            ? 0.1
            : 0.18;
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
  const north = dipole >= 0 ? palette.magnetN : palette.magnetS;
  const south = dipole >= 0 ? palette.magnetS : palette.magnetN;
  const rr = radius * 0.78;
  g.circle(0, 0, radius);
  g.fill({ color: style.fill, alpha: 1 });
  g.stroke({ width: lineWidth, color: style.edge, alpha: 0.9 });
  /* North along local +x (Planck); S on −x — matches moment direction. */
  g.beginPath();
  g.arc(0, 0, rr, -Math.PI / 2, Math.PI / 2, false);
  g.lineTo(0, -rr);
  g.closePath();
  g.fill({ color: north, alpha: 0.9 });
  g.beginPath();
  g.arc(0, 0, rr, Math.PI / 2, -Math.PI / 2, false);
  g.lineTo(0, rr);
  g.closePath();
  g.fill({ color: south, alpha: 0.9 });
  g.moveTo(0, -rr);
  g.lineTo(0, rr);
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
