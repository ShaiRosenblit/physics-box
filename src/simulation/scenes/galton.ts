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
 * Galton board (bean machine): staggered fixed pegs (`felt` nails — dead bounce,
 * high friction) and hopper marbles tuned for slow sideways creep after each hit.
 *
 * Peg–marble normal bounce uses Planck `max(restitutionPeg, restitutionMarble)`.
 * Felt alone (≈0.01) paired with marble `fixtureRestitution: 0.02` stayed slightly
 * lively; both pegs and marbles pin `fixtureRestitution: 0` so paired contacts resolve
 * with zero restitution (floor/walls still use material defaults vs this override).
 */
export function galton(world: World): void {
  /** Top surface of the floor plate (see `addWorkshopEnclosure`). */
  const groundTopY = 0;

  const pegRadius = 0.038 * 8;
  /** Center-to-center peg pitch (marble radius is `dropBallRadius` below). */
  const pegDx = 0.3 * 4;
  const pegDy = 0.31 * 4;
  const numRows = 10;
  /** Raised with larger `pegDy` so bottom row stays above bins (matched to old layout). */
  const pegArenaTop = 6.85 + (numRows - 1) * (pegDy - 0.31);

  const dropBallRadius = 0.042;
  /** Bottom / top of hopper strip — same vertical band as spawned marbles. */
  const hopperY0 = pegArenaTop + pegRadius + dropBallRadius + 0.42;
  const hopperYSpan = 3.25;
  const hopperTopY = hopperY0 + hopperYSpan;
  /** Space above tallest hopper marbles before the workshop ceiling shell. */
  const hopperCeilingClearance = 0.75;
  const workshopInteriorHeight = Math.max(
    DEFAULT_WORKSHOP_INTERIOR_HEIGHT,
    hopperTopY + dropBallRadius + hopperCeilingClearance,
  );

  addWorkshopEnclosure(world, {
    interiorHeight: workshopInteriorHeight,
  });

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

  const outerHalf =
    ((numRows - 1) / 2) * pegDx + pegRadius + 0.12;
  const wallThickness = 0.22;
  /** Softer wall hits so beads do not rebound out of the board. */
  const wallRestitution = 0.06;

  const numDropBalls = 100;
  /** Narrow band around x = 0 (half-width ~ few cm). */
  const hopperHalfX = 0.052;

  const wallTopY = hopperTopY + 0.35;
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

  /** Bleed speed after peg contacts; high friction at peg wraps kills rebound and creep is slow. */
  const marbleLinearDamping = 0.62;
  const marbleAngularDamping = 0.56;
  const marbleFriction = 1.05;
  /** 10× nominal `wood` density; same radius ⇒ 10× mass. */
  const marbleDensity = lookupMaterial("wood").density * 10;

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
        density: marbleDensity,
        fixtureRestitution: 0,
        fixtureFriction: marbleFriction,
        linearDamping: marbleLinearDamping,
        angularDamping: marbleAngularDamping,
      }),
    );
  }
}
