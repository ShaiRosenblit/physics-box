import type { World } from "../core/World";
import { ball } from "../mechanics/ball";
import { box } from "../mechanics/box";
import { engine } from "../mechanics/engine";
import { belt } from "../mechanics/belt";
import { hinge } from "../mechanics/hinge";
import { pulley } from "../mechanics/pulley";
import { rope } from "../mechanics/rope";
import { spring } from "../mechanics/spring";
import { worldAnchor, bodyAnchor } from "../mechanics/anchors";
import { addWorkshopEnclosure } from "./workshopEnclosure";

/**
 * Engines demo scene.
 *
 * Five stations left to right, each demonstrating a classical engine coupling:
 *
 *  1. Reference motor      (x ≈ -16) — bare engine, flywheel spinning freely.
 *  2. Belt gear-down       (x ≈ -9)  — small rotor → large pinned disc (slower).
 *  3. Belt gear-up         (x ≈ -2)  — large rotor → small pinned disc (faster).
 *  4. Windmill arm         (x ≈  5)  — engine → belt → hinge-pinned arm sweeping full circles.
 *  5. Atwood machine       (x ≈ 14)  — classic counterweight pulley (no engine).
 *
 * Workshop floor: y = 0, ceiling: y = 12.
 * Station dividers are thin fixed metal pillars.
 */
export function engines(world: World): void {
  addWorkshopEnclosure(world);

  // ── Thin dividers between stations ──────────────────────────────
  const dividerH = 4.0;
  const dividerW = 0.12;
  for (const dx of [-13.0, -6.5, 0.5, 8.5]) {
    world.add(
      box({
        position: { x: dx, y: dividerH / 2 },
        width: dividerW,
        height: dividerH,
        fixed: true,
        material: "metal",
      }),
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // STATION 1 — Reference motor  (x: −20 … −13)
  //
  // A single engine with nothing attached, showing the housing + spinning
  // flywheel at rest and under power.
  // A stack of wood boxes sits to the right as passive scenery.
  // ──────────────────────────────────────────────────────────────────────
  world.add(
    engine({
      position: { x: -17.0, y: 0.12 },
      width: 0.40,
      height: 0.24,
      rotorRadius: 0.10,
      torque: 240,
      fixed: true,
      angularDamping: 0.06,
    }),
  );

  const crateW = 0.65;
  for (let i = 0; i < 3; i++) {
    world.add(
      box({
        position: { x: -14.8, y: crateW / 2 + i * crateW },
        width: crateW,
        height: crateW,
        material: "wood",
      }),
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // STATION 2 — Belt gear-down  (x: −13 … −6.5)
  //
  // Engine rotor r = 0.08 → belt → large pinned disc r = 0.26.
  // Gear ratio ≈ −0.26 / 0.08 = −3.25  →  disc turns at ~30 % of rotor speed.
  // A small cork ball rests on top of the disc and eventually gets thrown.
  // ──────────────────────────────────────────────────────────────────────
  const eng2Id = world.add(
    engine({
      position: { x: -11.5, y: 0.12 },
      width: 0.36,
      height: 0.22,
      rotorRadius: 0.08,
      torque: 280,
      fixed: true,
      angularDamping: 0.05,
    }),
  );
  let snap = world.snapshot();
  let engView = snap.bodies.find((b) => b.id === eng2Id);
  const rotor2 = engView?.kind === "engine" ? engView.rotorId : null;

  const bigDiscX = -8.8;
  const bigDiscR = 0.26;
  const bigDisc = world.add(
    ball({
      position: { x: bigDiscX, y: bigDiscR },
      radius: bigDiscR,
      material: "metal",
      angularDamping: 0.04,
      linearDamping: 0,
    }),
  );
  // Pin the disc to the world (hinge first so belt reuses the revolute)
  world.addConstraint(hinge({ bodyA: bigDisc, worldAnchor: { x: bigDiscX, y: bigDiscR } }));
  if (rotor2 !== null) {
    world.addConstraint(belt({ driverRotorId: rotor2, drivenBodyId: bigDisc }));
  }

  // Small rider ball that will be flung off once the disc spins up
  world.add(
    ball({
      position: { x: bigDiscX, y: bigDiscR * 2 + 0.08 },
      radius: 0.08,
      material: "cork",
    }),
  );

  // ──────────────────────────────────────────────────────────────────────
  // STATION 3 — Belt gear-up  (x: −6.5 … +0.5)
  //
  // Engine rotor r = 0.16 → belt → small pinned disc r = 0.075.
  // Gear ratio ≈ −0.075 / 0.16 = −0.47  →  disc turns at ~2.1 × rotor speed.
  // A wood box rests on the floor to show the disc spinning beside it.
  // ──────────────────────────────────────────────────────────────────────
  const eng3Id = world.add(
    engine({
      position: { x: -5.0, y: 0.13 },
      width: 0.42,
      height: 0.26,
      rotorRadius: 0.16,
      torque: 210,
      fixed: true,
      angularDamping: 0.05,
    }),
  );
  snap = world.snapshot();
  engView = snap.bodies.find((b) => b.id === eng3Id);
  const rotor3 = engView?.kind === "engine" ? engView.rotorId : null;

  const smallDiscX = -2.8;
  const smallDiscR = 0.075;
  const smallDisc = world.add(
    ball({
      position: { x: smallDiscX, y: smallDiscR },
      radius: smallDiscR,
      material: "metal",
      angularDamping: 0.04,
      linearDamping: 0,
    }),
  );
  world.addConstraint(
    hinge({ bodyA: smallDisc, worldAnchor: { x: smallDiscX, y: smallDiscR } }),
  );
  if (rotor3 !== null) {
    world.addConstraint(belt({ driverRotorId: rotor3, drivenBodyId: smallDisc }));
  }

  // A loose wood block nearby, just for visual scale
  world.add(
    box({
      position: { x: -1.5, y: 0.2 },
      width: 0.4,
      height: 0.4,
      material: "wood",
    }),
  );

  // ──────────────────────────────────────────────────────────────────────
  // STATION 4 — Windmill arm  (x: +0.5 … +8.5)
  //
  // A fixed post rises from the floor.  A long arm (box) is pinned at the
  // post top via a hinge constraint so it can spin freely.  An engine next
  // to the post drives the arm through a belt.
  //
  // Several balls are placed near the arm's sweep radius; they get knocked
  // away once the arm starts rotating.
  //
  // Engine rotor r = 0.09, arm effective-radius = min(4.0, 0.20) / 2 = 0.10
  // GearJoint ratio ≈ −0.10 / 0.09 ≈ −1.1  (near 1:1 speed).
  // Torque is high to overcome the arm's large rotational inertia.
  // ──────────────────────────────────────────────────────────────────────
  const pivotX = 5.0;
  const pivotY = 2.70;

  // The post
  world.add(
    box({
      position: { x: pivotX, y: pivotY / 2 },
      width: 0.14,
      height: pivotY,
      fixed: true,
      material: "metal",
    }),
  );

  // The rotating arm (starts horizontal)
  const arm = world.add(
    box({
      position: { x: pivotX, y: pivotY },
      width: 4.0,
      height: 0.20,
      material: "wood",
      angularDamping: 0.03,
      linearDamping: 0,
    }),
  );
  // Hinge first so the belt reuses this revolute
  world.addConstraint(hinge({ bodyA: arm, worldAnchor: { x: pivotX, y: pivotY } }));

  const eng4Id = world.add(
    engine({
      position: { x: 2.2, y: 0.12 },
      width: 0.40,
      height: 0.24,
      rotorRadius: 0.09,
      torque: 2000,
      fixed: true,
      angularDamping: 0.04,
    }),
  );
  snap = world.snapshot();
  engView = snap.bodies.find((b) => b.id === eng4Id);
  const rotor4 = engView?.kind === "engine" ? engView.rotorId : null;
  if (rotor4 !== null) {
    world.addConstraint(belt({ driverRotorId: rotor4, drivenBodyId: arm }));
  }

  // Balls placed near the arm's sweep path (arm half-length ≈ 2 m from pivot)
  const armBalls: Array<[number, number]> = [
    [pivotX + 2.2, pivotY + 0.25], // to the right of arm tip
    [pivotX - 2.2, pivotY + 0.25], // to the left of arm tip
    [pivotX + 0.3, pivotY + 2.1],  // above pivot — hit when arm is ~vertical
    [pivotX - 0.3, pivotY - 2.0],  // below pivot
    [pivotX + 1.8, pivotY - 1.2],  // lower right quadrant
    [pivotX - 1.8, pivotY + 1.2],  // upper left quadrant
  ];
  for (const [bx, by] of armBalls) {
    world.add(
      ball({
        position: { x: bx, y: by },
        radius: 0.13,
        material: "wood",
        angularDamping: 0.05,
        linearDamping: 0.02,
      }),
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // STATION 5 — Atwood machine  (x: +8.5 … +20)
  //
  // Classic counterweight pulley: metal weight (heavy) vs wood weight (light)
  // over a fixed wheel.  The metal weight descends, wood rises.
  //
  // A second sub-demo shows a belt-driven disc with a hanging rope-weight,
  // illustrating how belt rotation couples to a swinging pendulum via a hinge.
  // ──────────────────────────────────────────────────────────────────────
  const atX = 13.5;
  const atCY = 7.5;
  const hs = 0.80; // half-spread of the pulley ground anchors
  const wR = 0.22; // weight ball radius

  // Support frame: two pillars and a crossbeam
  world.add(
    box({
      position: { x: atX - hs - 0.1, y: atCY / 2 },
      width: 0.12,
      height: atCY,
      fixed: true,
      material: "metal",
    }),
  );
  world.add(
    box({
      position: { x: atX + hs + 0.1, y: atCY / 2 },
      width: 0.12,
      height: atCY,
      fixed: true,
      material: "metal",
    }),
  );
  world.add(
    box({
      position: { x: atX, y: atCY + 0.08 },
      width: hs * 2 + 0.6,
      height: 0.12,
      fixed: true,
      material: "metal",
    }),
  );

  const weightHeavy = world.add(
    ball({
      position: { x: atX - hs, y: 4.5 },
      radius: wR,
      material: "metal",
    }),
  );
  const weightLight = world.add(
    ball({
      position: { x: atX + hs, y: 5.8 },
      radius: wR,
      material: "wood",
    }),
  );
  world.addConstraint(
    pulley({
      wheelCenter: { x: atX, y: atCY },
      bodyA: weightHeavy,
      bodyB: weightLight,
      localAnchorA: { x: 0, y: wR },
      localAnchorB: { x: 0, y: wR },
      halfSpread: hs,
    }),
  );

  // ── Sub-demo: belt-driven pendulum bob ───────────────────────────
  // Engine → belt → a hinged disc hanging on a rope spring.
  // The belt spins the disc; a mass hangs on a spring from above
  // and will oscillate once the disc gets nudged.
  const eng5Id = world.add(
    engine({
      position: { x: 17.5, y: 0.12 },
      width: 0.36,
      height: 0.22,
      rotorRadius: 0.09,
      torque: 260,
      fixed: true,
      angularDamping: 0.05,
    }),
  );
  snap = world.snapshot();
  engView = snap.bodies.find((b) => b.id === eng5Id);
  const rotor5 = engView?.kind === "engine" ? engView.rotorId : null;

  const disc5X = 19.0;
  const disc5R = 0.18;
  const disc5 = world.add(
    ball({
      position: { x: disc5X, y: disc5R },
      radius: disc5R,
      material: "metal",
      angularDamping: 0.05,
      linearDamping: 0,
    }),
  );
  world.addConstraint(
    hinge({ bodyA: disc5, worldAnchor: { x: disc5X, y: disc5R } }),
  );
  if (rotor5 !== null) {
    world.addConstraint(belt({ driverRotorId: rotor5, drivenBodyId: disc5 }));
  }

  // Spring-suspended weight that will sway once the disc gives it an impulse
  const bobId = world.add(
    ball({
      position: { x: disc5X, y: 3.2 },
      radius: 0.18,
      material: "metal",
    }),
  );
  world.addConstraint(
    spring({
      a: worldAnchor({ x: disc5X, y: 5.8 }),
      b: bodyAnchor(bobId),
      restLength: 2.4,
      frequencyHz: 1.8,
      dampingRatio: 0.35,
    }),
  );

  // Rope between the disc (at rim) and the pendulum bob —
  // the spinning disc will tug the bob into oscillation
  world.addConstraint(
    rope({
      a: bodyAnchor(disc5),
      b: bodyAnchor(bobId),
      length: 3.1,
      segments: 10,
      material: "wood",
    }),
  );
}
