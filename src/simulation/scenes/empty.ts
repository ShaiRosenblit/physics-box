import type { World } from "../core/World";
import { box } from "../mechanics/box";

/**
 * The blank scene: workshop floor only, used by tests and as a base for new sandbox sessions.
 */
export function empty(world: World): void {
  const groundHeight = 0.5;
  world.add(
    box({
      position: { x: 0, y: -groundHeight / 2 },
      width: 40,
      height: groundHeight,
      fixed: true,
      material: "wood",
    }),
  );
}
