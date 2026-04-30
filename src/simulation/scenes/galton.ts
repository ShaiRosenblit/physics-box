import type { World } from "../core/World";
import { ball } from "../mechanics/ball";
import { box } from "../mechanics/box";

/** One coordinate of Halton sequence (deterministic, low-discrepancy; no RNG). */
function halton1d(index: number, base: 2 | 3): number {
  let f = 1;
  let h = 0;
  let i = index + 1;
  while (i > 0) {
    f /= base;
    h += f * (i % base);
    i = Math.floor(i / base);
  }
  return h;
}

/**
 * Galton board (bean machine): staggered fixed pegs and a hopper of neutral balls
 * on a tall narrow strip above the apex so drops read as a thin vertical curtain.
 */
export function galton(world: World): void {
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

  const pegRadius = 0.038;
  const pegDx = 0.3;
  const pegDy = 0.31;
  const numRows = 10;
  const pegArenaTop = 6.85;

  for (let row = 0; row < numRows; row++) {
    const count = row + 1;
    for (let j = 0; j < count; j++) {
      const x = (j - row / 2) * pegDx;
      const y = pegArenaTop - row * pegDy;
      world.add(
        ball({
          position: { x, y },
          radius: pegRadius,
          fixed: true,
          material: "metal",
        }),
      );
    }
  }

  const outerHalf =
    ((numRows - 1) / 2) * pegDx + pegRadius + 0.12;
  const wallThickness = 0.22;
  const wallHeight = 10.8;
  const wallCenterY = pegArenaTop - ((numRows - 1) * pegDy) / 2 + 0.35;

  world.add(
    box({
      position: { x: -(outerHalf + wallThickness / 2), y: wallCenterY },
      width: wallThickness,
      height: wallHeight,
      fixed: true,
      material: "metal",
    }),
  );
  world.add(
    box({
      position: { x: outerHalf + wallThickness / 2, y: wallCenterY },
      width: wallThickness,
      height: wallHeight,
      fixed: true,
      material: "metal",
    }),
  );

  const binCount = numRows + 1;
  const binSpanLeft = -outerHalf + pegDx * 0.35;
  const binSpanRight = outerHalf - pegDx * 0.35;
  const binFloorCenterY = 0.38;
  const binDividerHalfHeight = 0.42;

  for (let k = 1; k < binCount; k++) {
    const t = k / binCount;
    const x = binSpanLeft + t * (binSpanRight - binSpanLeft);
    world.add(
      box({
        position: { x, y: binFloorCenterY },
        width: 0.06,
        height: binDividerHalfHeight * 2,
        fixed: true,
        material: "metal",
      }),
    );
  }

  const dropBallRadius = 0.042;
  const numDropBalls = 42;
  /** Bottom of hopper strip — clear of top peg row. */
  const hopperY0 = pegArenaTop + pegRadius + dropBallRadius + 0.42;
  /** Tall vertical span; X stays in a slit around x = 0. */
  const hopperYSpan = 3.25;
  /** Narrow band around x = 0 (half-width ~ few cm). */
  const hopperHalfX = 0.052;

  for (let i = 0; i < numDropBalls; i++) {
    const u = halton1d(i, 2);
    const v = halton1d(i, 3);
    const x = (u - 0.5) * 2 * hopperHalfX;
    const y = hopperY0 + v * hopperYSpan;
    world.add(
      ball({
        position: { x, y },
        radius: dropBallRadius,
        material: "wood",
      }),
    );
  }
}
