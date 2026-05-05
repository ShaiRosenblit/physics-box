import { Graphics } from "pixi.js";
import type { GoalZone } from "../../game/types";
import type { Camera } from "../camera/Camera";
import { palette } from "../style/palette";

/**
 * Renders puzzle-mode goal zones as soft amber rectangles behind the
 * physics layers. Visibility is purely declarative — pass the active
 * zones via `setZones`; pass an empty array to hide.
 *
 * The graphics are rebuilt whenever the zones or camera zoom change,
 * not every frame.
 */
export class GoalZoneView {
  readonly node = new Graphics();

  private zones: readonly GoalZone[] = [];
  private lastZoom = 0;

  setZones(zones: readonly GoalZone[]): void {
    if (zones === this.zones) return;
    this.zones = zones;
    this.lastZoom = 0; // force redraw on next update
  }

  update(camera: Camera): void {
    const zoom = camera.zoom;
    if (zoom === this.lastZoom) return;
    this.lastZoom = zoom;

    const g = this.node;
    g.clear();
    if (this.zones.length === 0) return;

    const edgeWidth = 2.0 / zoom;
    const innerWidth = 0.8 / zoom;

    for (const zone of this.zones) {
      const w = zone.halfExtents.x * 2;
      const h = zone.halfExtents.y * 2;
      const x = zone.center.x - zone.halfExtents.x;
      const y = zone.center.y - zone.halfExtents.y;
      g.rect(x, y, w, h);
      g.fill({ color: palette.goalZone, alpha: 0.14 });
      g.rect(x, y, w, h);
      g.stroke({ color: palette.goalZoneEdge, width: edgeWidth, alpha: 0.85 });
      const inset = Math.min(w, h) * 0.06;
      g.rect(x + inset, y + inset, w - inset * 2, h - inset * 2);
      g.stroke({ color: palette.goalZone, width: innerWidth, alpha: 0.5 });
    }
  }
}
