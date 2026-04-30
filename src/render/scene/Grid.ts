import { Graphics } from "pixi.js";
import type { Camera } from "../camera/Camera";
import { opacity, palette, stroke } from "../style/palette";

const MINOR_FADE_PX = 8;
const MAJOR_FADE_PX = 80;

/**
 * Subtle adaptive grid drawn in world coordinates.
 *
 * Minor lines spaced 1 unit, major every 5. Each line's alpha is scaled
 * by its on-screen spacing so the grid quietly fades at extreme zooms.
 *
 * The Graphics is redrawn whenever camera zoom or canvas size changes,
 * not every frame.
 */
export class Grid {
  readonly node = new Graphics();

  private lastZoom = 0;
  private lastWidth = 0;
  private lastHeight = 0;
  private lastCenterX = Number.NaN;
  private lastCenterY = Number.NaN;

  constructor(
    private readonly minorSpacing = 1,
    private readonly majorEvery = 5,
  ) {}

  update(camera: Camera): void {
    const { width, height } = camera.canvasSize;
    const center = camera.center;
    const zoom = camera.zoom;

    if (
      zoom === this.lastZoom &&
      width === this.lastWidth &&
      height === this.lastHeight &&
      center.x === this.lastCenterX &&
      center.y === this.lastCenterY
    ) {
      return;
    }

    this.lastZoom = zoom;
    this.lastWidth = width;
    this.lastHeight = height;
    this.lastCenterX = center.x;
    this.lastCenterY = center.y;

    this.redraw(camera);
  }

  private redraw(camera: Camera): void {
    const g = this.node;
    g.clear();

    const minorPx = this.minorSpacing * camera.zoom;
    const majorPx = this.majorEvery * minorPx;

    const minorAlpha = fadeIn(minorPx, MINOR_FADE_PX) * opacity.gridMinor;
    const majorAlpha = fadeIn(majorPx, MAJOR_FADE_PX) * opacity.gridMajor;

    if (minorAlpha < 0.01 && majorAlpha < 0.01) return;

    const bounds = camera.visibleBounds();
    const minorWidth = stroke.gridMinor / camera.zoom;
    const majorWidth = stroke.gridMajor / camera.zoom;

    const startX = Math.floor(bounds.minX / this.minorSpacing) * this.minorSpacing;
    const endX = Math.ceil(bounds.maxX / this.minorSpacing) * this.minorSpacing;
    const startY = Math.floor(bounds.minY / this.minorSpacing) * this.minorSpacing;
    const endY = Math.ceil(bounds.maxY / this.minorSpacing) * this.minorSpacing;

    for (let x = startX; x <= endX + 1e-9; x += this.minorSpacing) {
      const isMajor = isOn(x, this.minorSpacing * this.majorEvery);
      const alpha = isMajor ? majorAlpha : minorAlpha;
      if (alpha < 0.01) continue;
      g.moveTo(x, bounds.minY);
      g.lineTo(x, bounds.maxY);
      g.stroke({
        width: isMajor ? majorWidth : minorWidth,
        color: palette.rule,
        alpha,
      });
    }

    for (let y = startY; y <= endY + 1e-9; y += this.minorSpacing) {
      const isMajor = isOn(y, this.minorSpacing * this.majorEvery);
      const alpha = isMajor ? majorAlpha : minorAlpha;
      if (alpha < 0.01) continue;
      g.moveTo(bounds.minX, y);
      g.lineTo(bounds.maxX, y);
      g.stroke({
        width: isMajor ? majorWidth : minorWidth,
        color: palette.rule,
        alpha,
      });
    }
  }
}

function fadeIn(px: number, fadePx: number): number {
  if (px >= fadePx * 2) return 1;
  if (px <= fadePx * 0.5) return 0;
  return (px - fadePx * 0.5) / (fadePx * 1.5);
}

function isOn(value: number, step: number): boolean {
  const r = Math.abs(value) % step;
  return r < 1e-6 || step - r < 1e-6;
}
