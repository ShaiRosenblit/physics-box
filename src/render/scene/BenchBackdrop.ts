import { Container, TilingSprite, type Texture } from "pixi.js";
import type { Camera } from "../camera/Camera";
import { opacity } from "../style/palette";

/**
 * World-space repeating workbench surface behind the grid.
 *
 * `tileScale` is tuned so pegboard-scale reads plausibly at typical zooms
 * (see `BENCH_PATTERN_SCALE`); adjust if the source texture resolution changes.
 */
const BENCH_PATTERN_SCALE = 0.29;

/**
 * Extra world margin around the visible rect so panning one frame does not
 * show empty paper at the edges before the next `update`.
 */
const BENCH_PAD_METERS = 2.4;

export class BenchBackdrop {
  readonly node = new Container();
  private readonly tiling: TilingSprite;
  private lastKey = "";

  constructor(texture: Texture) {
    this.tiling = new TilingSprite({
      texture,
      width: 1,
      height: 1,
      alpha: opacity.benchBackdrop,
    });
    this.tiling.tileScale.set(BENCH_PATTERN_SCALE, BENCH_PATTERN_SCALE);
    this.node.addChild(this.tiling);
  }

  update(camera: Camera): void {
    const b = camera.visibleBounds();
    const minX = b.minX - BENCH_PAD_METERS;
    const maxX = b.maxX + BENCH_PAD_METERS;
    const minY = b.minY - BENCH_PAD_METERS;
    const maxY = b.maxY + BENCH_PAD_METERS;
    const w = maxX - minX;
    const h = maxY - minY;

    const key = `${minX.toFixed(3)}:${minY.toFixed(3)}:${w.toFixed(3)}:${h.toFixed(3)}`;
    if (key === this.lastKey) return;
    this.lastKey = key;

    this.tiling.position.set(minX, minY);
    this.tiling.setSize(w, h);
  }

  destroy(): void {
    this.node.destroy({ children: true });
  }
}
