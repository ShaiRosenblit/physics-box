import type { World } from "../core/World";
import { ball } from "../mechanics/ball";
import { box } from "../mechanics/box";
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
  const beamHalfW = n * bobR + 0.38;

  world.add(
    box({
      position: { x: 0, y: beamCenterY },
      width: beamHalfW * 2,
      height: beamH,
      fixed: true,
      material: "metal",
    }),
  );

  /** First bob only: angle from vertical toward −x (rad). */
  const pullAngle = 0.5;

  for (let i = 0; i < n; i++) {
    const ax = (i - (n - 1) / 2) * (2 * bobR);
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
        fixtureRestitution: 0.9,
        fixtureFriction: 0.06,
        linearDamping: 0.004,
        angularDamping: 0.02,
      }),
    );

    world.addConstraint(
      rope({
        a: worldAnchor({ x: ax, y: anchorY }),
        b: bodyAnchor(id),
        length: cordLength,
        segments: 12,
        material: "wood",
      }),
    );
  }
}
