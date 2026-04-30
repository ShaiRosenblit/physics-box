import type { World } from "../core/World";
import { ball } from "../mechanics/ball";
import { box } from "../mechanics/box";

/**
 * Welcome scene — v1 (M2).
 *
 * A wide wooden ground plane, a small stack of wooden crates on the
 * left, and three balls of varied size/material poised to settle.
 * Composed to feel intentional from first run; richer versions land
 * in M5 (constraints), M6 (charges), M7 (magnets), and M8 (composition
 * pass).
 */
export function welcome(world: World): void {
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

  const crateSize = 0.7;
  for (let i = 0; i < 3; i++) {
    world.add(
      box({
        position: { x: -3.2, y: crateSize / 2 + i * crateSize },
        width: crateSize,
        height: crateSize,
        material: "wood",
      }),
    );
  }

  world.add(
    box({
      position: { x: 4.0, y: 0.45 },
      width: 0.9,
      height: 0.9,
      material: "wood",
    }),
  );

  world.add(
    ball({
      position: { x: -1.1, y: 4.6 },
      radius: 0.5,
      material: "metal",
    }),
  );
  world.add(
    ball({
      position: { x: 1.0, y: 3.4 },
      radius: 0.4,
      material: "wood",
    }),
  );
  world.add(
    ball({
      position: { x: 2.6, y: 4.2 },
      radius: 0.32,
      material: "cork",
    }),
  );
}
