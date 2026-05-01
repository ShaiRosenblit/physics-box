import type { World } from "../core/World";
import { ball } from "../mechanics/ball";
import { box } from "../mechanics/box";
import { lookupMaterial } from "../mechanics/materials";
import { rope } from "../mechanics/rope";
import { worldAnchor, bodyAnchor } from "../mechanics/anchors";
import { addWorkshopEnclosure } from "./workshopEnclosure";

/**
 * Newton's cradle: equal metal bobs on parallel cords from a beam; the first is
 * drawn aside so collisions shuttle motion along the line (idealized in 2D).
 */
export function newtonsCradle(world: World): void {
  addWorkshopEnclosure(world);

  const bobR = 0.15;
  const n = 5;
  const cordLength = 4.1;
  const beamCenterY = 10.55;
  const beamH = 0.14;
  const anchorY = beamCenterY - beamH / 2;

  // A small gap keeps resting balls from forming a pre-existing contact chain.
  // Without it, all four ball-ball contacts are active simultaneously when the
  // first bob arrives, and Box2D's sequential-impulse solver distributes the
  // impulse across the whole chain instead of propagating it cleanly end-to-end.
  // 0.008 > Planck linearSlop (~0.005) so no pre-contact is created at rest,
  // yet the gap is < 3 % of ball diameter and visually imperceptible.
  const bobGap = 0.008;
  const spacing = 2 * bobR + bobGap;
  const beamHalfW = ((n - 1) / 2) * spacing + bobR + 0.38;

  world.add(
    box({
      position: { x: 0, y: beamCenterY },
      width: beamHalfW * 2,
      height: beamH,
      fixed: true,
      material: "metal",
      fixtureFriction: 0,
      fixtureRestitution: 1,
    }),
  );

  /** First bob only: angle from vertical toward −x (rad). */
  const pullAngle = 0.5;

  const bobDensity = lookupMaterial("metal").density * 10;

  for (let i = 0; i < n; i++) {
    const ax = (i - (n - 1) / 2) * spacing;
    const pull = i === 0;
    const sinA = pull ? Math.sin(pullAngle) : 0;
    const cosA = pull ? Math.cos(pullAngle) : 1;
    const bx = ax - cordLength * sinA;
    const by = anchorY - cordLength * cosA;

    const id = world.add(
      ball({
        position: { x: bx, y: by },
        radius: bobR,
        material: "metal",
        density: bobDensity,
        fixtureRestitution: 1,
        fixtureFriction: 0,
        linearDamping: 0,
        angularDamping: 0,
      }),
    );

    world.addConstraint(
      rope({
        a: worldAnchor({ x: ax, y: anchorY }),
        b: bodyAnchor(id),
        length: cordLength,
        segments: 0,
        material: "wood",
      }),
    );
  }
}
