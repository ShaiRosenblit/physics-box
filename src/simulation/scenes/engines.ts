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
 * Engines demo scene — five mechanical stations from left to right.
 *
 * Tuning note: Box2D clamps angular displacement to 0.5π per step. Without a
 * brake, even a tiny motor torque on a small metal rotor drives angular
 * velocity straight to that cap (~30 rev/s), which aliases on a 60 Hz display
 * and makes the rotor look frozen. Every engine here pairs a small torque with
 * substantial `angularDamping` so the rotor settles at a perceivable speed.
 *
 *  1. Reference motor      — bare engine, flywheel spinning at ~1.5 rev/s.
 *  2. Belt gear-down       — small rotor drives a large pinned disc (slower).
 *  3. Belt gear-up         — large rotor drives a small pinned disc (faster).
 *  4. Windmill arm         — engine drives a hinge-pinned arm, sweeping balls.
 *  5. Atwood machine       — counterweight pulley + belt-driven oscillator.
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
  // Single engine, no load. With τ=0.025 and rotor angularDamping=2.0,
  // terminal ω ≈ 0.025/(I·d) ≈ 10 rad/s ≈ 1.6 rev/s — clearly visible.
  // ──────────────────────────────────────────────────────────────────────
  world.add(
    engine({
      position: { x: -17.0, y: 0.12 },
      width: 0.40,
      height: 0.24,
      rotorRadius: 0.10,
      torque: 0.025,
      fixed: true,
      angularDamping: 2.0,
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
  // Engine rotor r=0.08 → belt → metal disc r=0.26 (pinned by hinge first
  // so the belt's GearJoint reuses that revolute).
  // Effective gear ratio ≈ −0.26/0.08 = −3.25.
  // Disc has its own angularDamping; rotor sits at higher ω, disc lower.
  // ──────────────────────────────────────────────────────────────────────
  const eng2Id = world.add(
    engine({
      position: { x: -11.5, y: 0.12 },
      width: 0.36,
      height: 0.22,
      rotorRadius: 0.08,
      torque: 0.07,
      fixed: true,
      angularDamping: 2.5,
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
      angularDamping: 1.8,
      linearDamping: 0,
    }),
  );
  // Pin the disc to the world (hinge first so belt reuses the revolute)
  world.addConstraint(
    hinge({ bodyA: bigDisc, worldAnchor: { x: bigDiscX, y: bigDiscR } }),
  );
  if (rotor2 !== null) {
    world.addConstraint(belt({ driverRotorId: rotor2, drivenBodyId: bigDisc }));
  }

  // Small rider ball that sits on top of the disc — gets gently flung off
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
  // Engine rotor r=0.16 (clamped to ~0.11 by housing geometry) → small
  // metal disc r=0.075. Ratio ≈ −0.075/0.11 ≈ −0.68 → small disc spins
  // ~1.5× the rotor speed.
  // ──────────────────────────────────────────────────────────────────────
  const eng3Id = world.add(
    engine({
      position: { x: -5.0, y: 0.13 },
      width: 0.42,
      height: 0.26,
      rotorRadius: 0.16,
      torque: 0.030,
      fixed: true,
      angularDamping: 2.5,
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
      angularDamping: 1.8,
      linearDamping: 0,
    }),
  );
  world.addConstraint(
    hinge({ bodyA: smallDisc, worldAnchor: { x: smallDiscX, y: smallDiscR } }),
  );
  if (rotor3 !== null) {
    world.addConstraint(belt({ driverRotorId: rotor3, drivenBodyId: smallDisc }));
  }

  // A loose wood block nearby for visual scale
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
  // Long arm (4 m × 0.2 m wood) hinge-pinned at its center on a metal post.
  // The arm has very high rotational inertia (I ≈ 0.64 kg·m²) compared to
  // the rotor (I ≈ 0.0008), so the GearJoint slows the rotor to match the
  // arm. Tuned for ω_arm ≈ 1 rad/s — about one revolution every 6 s.
  // ──────────────────────────────────────────────────────────────────────
  const pivotX = 5.0;
  const pivotY = 2.85;
  const armHalfH = 0.10;

  // Post extends right up to the pivot. The arm hinges directly to the
  // post (not ground) so `collideConnected=false` means they don't bump
  // — same trick a real windmill uses by mounting sails in front of the
  // tower body.
  const postId = world.add(
    box({
      position: { x: pivotX, y: pivotY / 2 },
      width: 0.14,
      height: pivotY,
      fixed: true,
      material: "metal",
    }),
  );

  const arm = world.add(
    box({
      position: { x: pivotX, y: pivotY },
      width: 4.0,
      height: armHalfH * 2,
      material: "wood",
      angularDamping: 0.6,
      linearDamping: 0,
    }),
  );
  world.addConstraint(
    hinge({
      bodyA: arm,
      bodyB: postId,
      worldAnchor: { x: pivotX, y: pivotY },
    }),
  );

  const eng4Id = world.add(
    engine({
      position: { x: 2.2, y: 0.12 },
      width: 0.40,
      height: 0.24,
      rotorRadius: 0.09,
      torque: 1.2,
      fixed: true,
      angularDamping: 0.6,
    }),
  );
  snap = world.snapshot();
  engView = snap.bodies.find((b) => b.id === eng4Id);
  const rotor4 = engView?.kind === "engine" ? engView.rotorId : null;
  if (rotor4 !== null) {
    world.addConstraint(belt({ driverRotorId: rotor4, drivenBodyId: arm }));
  }

  // Balls placed clear of the arm's initial position (it spawns horizontal),
  // sized small enough to be tossed without weighing the arm down too much.
  // Positioned past the arm's tip x ∈ [pivotX±2] so they don't sit on top.
  const armBalls: Array<[number, number]> = [
    [pivotX + 2.4, 0.10],
    [pivotX + 2.7, 0.10],
    [pivotX - 2.4, 0.10],
    [pivotX - 2.7, 0.10],
  ];
  for (const [bx, by] of armBalls) {
    world.add(
      ball({
        position: { x: bx, y: by },
        radius: 0.10,
        material: "cork",
        angularDamping: 0.05,
        linearDamping: 0.02,
      }),
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // STATION 5 — Atwood machine  (x: +8.5 … +20)
  //
  // Classic counterweight pulley: heavy metal vs lighter wood ball over a
  // fixed wheel. Sub-demo: belt-driven disc tugs a spring-suspended bob
  // through a rope, showing rope+belt+spring chained together.
  // ──────────────────────────────────────────────────────────────────────
  const atX = 13.5;
  const atCY = 7.5;
  const hs = 0.80;
  const wR = 0.22;

  // Support frame: two pillars + crossbeam
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

  // ── Sub-demo: belt-driven oscillator ────────────────────────────
  const eng5Id = world.add(
    engine({
      position: { x: 17.5, y: 0.12 },
      width: 0.36,
      height: 0.22,
      rotorRadius: 0.09,
      torque: 0.040,
      fixed: true,
      angularDamping: 2.5,
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
      angularDamping: 1.5,
      linearDamping: 0,
    }),
  );
  world.addConstraint(
    hinge({ bodyA: disc5, worldAnchor: { x: disc5X, y: disc5R } }),
  );
  if (rotor5 !== null) {
    world.addConstraint(belt({ driverRotorId: rotor5, drivenBodyId: disc5 }));
  }

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
