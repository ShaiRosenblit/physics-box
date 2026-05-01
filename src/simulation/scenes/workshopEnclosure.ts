import type { World } from "../core/World";
import { box } from "../mechanics/box";

/** Half-width of the workshop floor plate (total width 40 m). */
export const WORKSHOP_FLOOR_HALF_WIDTH = 20;

const GROUND_HEIGHT = 0.5;
const WALL_THICKNESS = 0.5;

/** Default from floor top (y = 0) to inner ceiling face; clears legacy scene anchors. */
export const DEFAULT_WORKSHOP_INTERIOR_HEIGHT = 12;

export interface WorkshopEnclosureOptions {
  /** Overrides {@link DEFAULT_WORKSHOP_INTERIOR_HEIGHT} when a scene needs more headroom. */
  readonly interiorHeight?: number;
}

/**
 * Fixed workshop shell: floor, side walls, and ceiling.
 */
export function addWorkshopEnclosure(
  world: World,
  options?: WorkshopEnclosureOptions,
): void {
  const interiorHeight =
    options?.interiorHeight ?? DEFAULT_WORKSHOP_INTERIOR_HEIGHT;

  world.add(
    box({
      position: { x: 0, y: -GROUND_HEIGHT / 2 },
      width: WORKSHOP_FLOOR_HALF_WIDTH * 2,
      height: GROUND_HEIGHT,
      fixed: true,
      material: "wood",
    }),
  );

  const wallCenterY = interiorHeight / 2;
  world.add(
    box({
      position: {
        x: -WORKSHOP_FLOOR_HALF_WIDTH - WALL_THICKNESS / 2,
        y: wallCenterY,
      },
      width: WALL_THICKNESS,
      height: interiorHeight,
      fixed: true,
      material: "wood",
    }),
  );
  world.add(
    box({
      position: {
        x: WORKSHOP_FLOOR_HALF_WIDTH + WALL_THICKNESS / 2,
        y: wallCenterY,
      },
      width: WALL_THICKNESS,
      height: interiorHeight,
      fixed: true,
      material: "wood",
    }),
  );

  const ceilingSpan = WORKSHOP_FLOOR_HALF_WIDTH * 2 + 2 * WALL_THICKNESS;
  world.add(
    box({
      position: {
        x: 0,
        y: interiorHeight + WALL_THICKNESS / 2,
      },
      width: ceilingSpan,
      height: WALL_THICKNESS,
      fixed: true,
      material: "wood",
    }),
  );
}
