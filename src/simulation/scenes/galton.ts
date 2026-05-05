import type { World } from "../core/World";
import { ball } from "../mechanics/ball";
import { box } from "../mechanics/box";
import { lookupMaterial } from "../mechanics/materials";
import {
  addWorkshopEnclosure,
  DEFAULT_WORKSHOP_INTERIOR_HEIGHT,
} from "./workshopEnclosure";

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
 * Galton board (bean machine): staggered fixed pegs and a vertical marble magazine.
 *
 * Marbles are stacked in a tight column (magazine) starting just above the first peg.
 * Each marble falls only one marble-diameter before reaching the peg, so entry
 * velocity is ~1.3 m/s instead of the ~8 m/s that a wide hopper produces. Low entry
 * speed is essential: a fast marble bounces off the peg with significant horizontal
 * velocity and skips rows, ruining the binomial distribution.
 *
 * A narrow chimney (two fixed walls) flanks the column to keep it aligned above the
 * entry point. Pegs and marbles both use fixtureRestitution: 0 so peg contacts are
 * fully inelastic in the normal direction.
 */
export function galton(world: World): void {
  const groundTopY = 0;

  const pegRadius = 0.038 * 8;
  const pegDx = 0.3 * 4;
  const pegDy = 0.31 * 4;
  const numRows = 10;
  const pegArenaTop = 6.85 + (numRows - 1) * (pegDy - 0.31);

  const dropBallRadius = 0.042;
  const numDropBalls = 100;
  /** Narrow x band so each marble has a small, unique lateral offset at the first peg. */
  const hopperHalfX = 0.052;

  // ── Marble magazine (vertical column) ────────────────────────────────────
  // Tiny gap prevents initial overlap while keeping marbles nearly touching.
  // The column rests on the first peg; when the bottom marble slides off,
  // the next drops ~one marble-diameter and arrives at low speed.
  const marbleGap = 0.004;
  const marbleSpacing = 2 * dropBallRadius + marbleGap;

  /** Bottom marble sits just above the top of the first peg. */
  const magazineY0 = pegArenaTop + pegRadius + dropBallRadius + marbleGap;
  const columnTopY = magazineY0 + (numDropBalls - 1) * marbleSpacing;

  const workshopInteriorHeight = Math.max(
    DEFAULT_WORKSHOP_INTERIOR_HEIGHT,
    columnTopY + dropBallRadius + 0.8,
  );

  addWorkshopEnclosure(world, { interiorHeight: workshopInteriorHeight });

  // ── Pegs ─────────────────────────────────────────────────────────────────
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
          material: "felt",
          fixtureRestitution: 0,
        }),
      );
    }
  }

  // ── Outer side walls ─────────────────────────────────────────────────────
  const outerHalf = ((numRows - 1) / 2) * pegDx + pegRadius + 0.12;
  const wallThickness = 0.22;
  const wallRestitution = 0.06;

  const wallTopY = columnTopY + 0.5;
  const wallHeight = wallTopY - groundTopY;
  const wallCenterY = wallHeight / 2;

  world.add(
    box({
      position: { x: -(outerHalf + wallThickness / 2), y: wallCenterY },
      width: wallThickness,
      height: wallHeight,
      fixed: true,
      material: "metal",
      fixtureRestitution: wallRestitution,
    }),
  );
  world.add(
    box({
      position: { x: outerHalf + wallThickness / 2, y: wallCenterY },
      width: wallThickness,
      height: wallHeight,
      fixed: true,
      material: "metal",
      fixtureRestitution: wallRestitution,
    }),
  );

  // ── Bin dividers ─────────────────────────────────────────────────────────
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
        fixtureRestitution: wallRestitution,
      }),
    );
  }

  // ── Chimney walls ─────────────────────────────────────────────────────────
  // Start above the first peg's top edge so the walls don't intersect the peg.
  // Inner half-width clears the maximum marble lateral offset (hopperHalfX + r).
  const chimneyInnerHalfW = hopperHalfX + dropBallRadius + 0.02;
  const chimneyWallW = 0.12;
  const chimneyBottom = pegArenaTop + pegRadius + dropBallRadius * 2 + 0.05;
  const chimneyTop = columnTopY + 0.4;
  const chimneyH = chimneyTop - chimneyBottom;
  const chimneyCY = chimneyBottom + chimneyH / 2;

  world.add(
    box({
      position: { x: -(chimneyInnerHalfW + chimneyWallW / 2), y: chimneyCY },
      width: chimneyWallW,
      height: chimneyH,
      fixed: true,
      material: "metal",
      fixtureRestitution: 0,
    }),
  );
  world.add(
    box({
      position: { x: chimneyInnerHalfW + chimneyWallW / 2, y: chimneyCY },
      width: chimneyWallW,
      height: chimneyH,
      fixed: true,
      material: "metal",
      fixtureRestitution: 0,
    }),
  );

  // ── Marbles ───────────────────────────────────────────────────────────────
  const marbleLinearDamping = 0.62;
  const marbleAngularDamping = 0.56;
  const marbleFriction = 1.05;
  const marbleDensity = lookupMaterial("wood").density * 10;

  for (let i = 0; i < numDropBalls; i++) {
    // Halton base-2 for x gives each marble a unique small lateral offset that
    // determines which side of the first peg it hits. y is linear so the
    // column is tightly packed from bottom to top.
    const u = halton1d(i + 1, 2); // offset by 1 to avoid u=0.5 (dead-centre hit)
    const x = (u - 0.5) * 2 * hopperHalfX;
    const y = magazineY0 + i * marbleSpacing;
    world.add(
      ball({
        position: { x, y },
        radius: dropBallRadius,
        material: "wood",
        density: marbleDensity,
        fixtureRestitution: 0,
        fixtureFriction: marbleFriction,
        linearDamping: marbleLinearDamping,
        angularDamping: marbleAngularDamping,
      }),
    );
  }
}
