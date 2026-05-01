import type { World } from "../core/World";
import { box } from "../mechanics/box";

/** Half-width of the workshop floor plate (total width 40 m). */
export const WORKSHOP_FLOOR_HALF_WIDTH = 20;

const GROUND_HEIGHT = 0.5;
const WALL_THICKNESS = 0.5;
/** From floor top (y = 0) to inner ceiling face; clears welcome-scene anchors. */
const ROOM_INTERIOR_HEIGHT = 12;

export interface WorkshopEnclosureOptions {
  /**
   * Override restitution on all shell fixtures when set (floor, perimeter walls,
   * ceiling). Scenes needing dead contacts (e.g. Galton) use `0`; Planck mixes
   * contacts with max(restitutionA, restitutionB), so shells must stay low if
   * dynamic beads use low restitution.
   */
  readonly shellFixtureRestitution?: number;
}

/**
 * Fixed workshop shell: floor, side walls, and ceiling.
 */
export function addWorkshopEnclosure(
  world: World,
  options?: WorkshopEnclosureOptions,
): void {
  const shellRes = options?.shellFixtureRestitution;

  world.add(
    box({
      position: { x: 0, y: -GROUND_HEIGHT / 2 },
      width: WORKSHOP_FLOOR_HALF_WIDTH * 2,
      height: GROUND_HEIGHT,
      fixed: true,
      material: "wood",
      ...(shellRes !== undefined ? { fixtureRestitution: shellRes } : {}),
    }),
  );

  const wallCenterY = ROOM_INTERIOR_HEIGHT / 2;
  world.add(
    box({
      position: {
        x: -WORKSHOP_FLOOR_HALF_WIDTH - WALL_THICKNESS / 2,
        y: wallCenterY,
      },
      width: WALL_THICKNESS,
      height: ROOM_INTERIOR_HEIGHT,
      fixed: true,
      material: "wood",
      ...(shellRes !== undefined ? { fixtureRestitution: shellRes } : {}),
    }),
  );
  world.add(
    box({
      position: {
        x: WORKSHOP_FLOOR_HALF_WIDTH + WALL_THICKNESS / 2,
        y: wallCenterY,
      },
      width: WALL_THICKNESS,
      height: ROOM_INTERIOR_HEIGHT,
      fixed: true,
      material: "wood",
      ...(shellRes !== undefined ? { fixtureRestitution: shellRes } : {}),
    }),
  );

  const ceilingSpan = WORKSHOP_FLOOR_HALF_WIDTH * 2 + 2 * WALL_THICKNESS;
  world.add(
    box({
      position: { x: 0, y: ROOM_INTERIOR_HEIGHT + WALL_THICKNESS / 2 },
      width: ceilingSpan,
      height: WALL_THICKNESS,
      fixed: true,
      material: "wood",
      ...(shellRes !== undefined ? { fixtureRestitution: shellRes } : {}),
    }),
  );
}
