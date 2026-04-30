import type { World } from "../core/World";
import { ball } from "../mechanics/ball";
import { box } from "../mechanics/box";

/**
 * Galton board (bean machine): staggered fixed pegs and a hopper of neutral balls
 * that cascade through random-looking left/right deflections into bottom bins.
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

  const pegRadius = 0.065;
  const pegDx = 0.42;
  const pegDy = 0.38;
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

  const dropBallRadius = 0.1;
  const hopperRowGap = dropBallRadius * 2 + 0.05;
  const hopperColGap = dropBallRadius * 2 + 0.04;
  const hopperCols = 6;
  const hopperRows = 7;
  const hopperBaseY = pegArenaTop + dropBallRadius + 0.55;
  const hopperTopY = hopperBaseY + (hopperRows - 1) * hopperRowGap;

  for (let r = 0; r < hopperRows; r++) {
    for (let c = 0; c < hopperCols; c++) {
      const x = (c - (hopperCols - 1) / 2) * hopperColGap;
      const y = hopperTopY - r * hopperRowGap;
      world.add(
        ball({
          position: { x, y },
          radius: dropBallRadius,
          material: "wood",
        }),
      );
    }
  }
}
