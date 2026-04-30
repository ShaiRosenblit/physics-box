import type { Container } from "pixi.js";
import type { Vec2 } from "../../simulation";

export interface CameraState {
  readonly center: Vec2;
  readonly zoom: number;
}

/**
 * Camera transforming a world-space `Container` so that physics units
 * (meters) map onto canvas pixels with origin centered, Y axis flipped.
 *
 * Math:
 *   sx = canvasWidth  / 2 + (wx - center.x) * zoom
 *   sy = canvasHeight / 2 - (wy - center.y) * zoom
 */
export class Camera {
  private _center: Vec2;
  private _zoom: number;
  private _canvasWidth = 0;
  private _canvasHeight = 0;

  constructor(initial?: Partial<CameraState>) {
    this._center = initial?.center ?? { x: 0, y: 2 };
    this._zoom = initial?.zoom ?? 40;
  }

  get center(): Vec2 {
    return this._center;
  }

  get zoom(): number {
    return this._zoom;
  }

  get canvasSize(): { width: number; height: number } {
    return { width: this._canvasWidth, height: this._canvasHeight };
  }

  setCenter(center: Vec2): void {
    this._center = center;
  }

  setZoom(zoom: number): void {
    if (zoom <= 0 || !Number.isFinite(zoom)) return;
    this._zoom = zoom;
  }

  setCanvas(width: number, height: number): void {
    this._canvasWidth = width;
    this._canvasHeight = height;
  }

  /** Apply current state onto the world-space container. */
  apply(worldRoot: Container): void {
    worldRoot.scale.set(this._zoom, -this._zoom);
    worldRoot.position.set(
      this._canvasWidth / 2 - this._center.x * this._zoom,
      this._canvasHeight / 2 + this._center.y * this._zoom,
    );
  }

  /** Convert screen-pixel coords to world coords. */
  screenToWorld(sx: number, sy: number): Vec2 {
    return {
      x: (sx - this._canvasWidth / 2) / this._zoom + this._center.x,
      y: -(sy - this._canvasHeight / 2) / this._zoom + this._center.y,
    };
  }

  /** Convert world coords to screen-pixel coords. */
  worldToScreen(wx: number, wy: number): Vec2 {
    return {
      x: this._canvasWidth / 2 + (wx - this._center.x) * this._zoom,
      y: this._canvasHeight / 2 - (wy - this._center.y) * this._zoom,
    };
  }

  /** Visible world rectangle (inclusive). */
  visibleBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    const halfW = this._canvasWidth / 2 / this._zoom;
    const halfH = this._canvasHeight / 2 / this._zoom;
    return {
      minX: this._center.x - halfW,
      maxX: this._center.x + halfW,
      minY: this._center.y - halfH,
      maxY: this._center.y + halfH,
    };
  }
}
