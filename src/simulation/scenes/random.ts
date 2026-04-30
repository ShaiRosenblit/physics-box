import type { Id } from "../core/types";
import type { World } from "../core/World";
import { ball } from "../mechanics/ball";
import { box } from "../mechanics/box";
import { magnet } from "../mechanics/magnet";
import { bodyAnchor, worldAnchor } from "../mechanics/anchors";
import { hinge } from "../mechanics/hinge";
import { pulley } from "../mechanics/pulley";
import { rope } from "../mechanics/rope";
import { spring } from "../mechanics/spring";
import { addWorkshopEnclosure } from "./workshopEnclosure";

/** Scene-only RNG (mulberry32). Stepping stays free of RNG; each load picks a fresh seed unless overridden. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function defaultSeed(): number {
  const perf =
    typeof globalThis.performance !== "undefined"
      ? Math.floor(globalThis.performance.now() * 1e6)
      : 0;
  return (Date.now() ^ perf) >>> 0;
}

type MaterialChoice = "wood" | "metal" | "cork" | "felt";

interface BodyRecord {
  readonly id: Id;
  readonly kind: "ball" | "box" | "magnet";
  readonly x: number;
  readonly y: number;
  /** Collision / clearance radius (ball radius or box half-diagonal). */
  readonly clearance: number;
  /** For pulley local anchors on balls. */
  readonly radius: number;
}

const MATERIALS: readonly MaterialChoice[] = [
  "wood",
  "metal",
  "cork",
  "felt",
];

const CEILING_ANCHOR_Y = 11.15;
const INNER_X = 16;
const INNER_Y_MIN = 0.85;
const INNER_Y_MAX = 9.2;

function pickMaterial(rnd: () => number): MaterialChoice {
  return MATERIALS[Math.floor(rnd() * MATERIALS.length)]!;
}

function tooClose(
  x: number,
  y: number,
  r: number,
  placed: readonly BodyRecord[],
): boolean {
  const margin = 0.92;
  for (const p of placed) {
    const dx = x - p.x;
    const dy = y - p.y;
    if (dx * dx + dy * dy < (r + p.clearance) ** 2 * margin) {
      return true;
    }
  }
  return false;
}

function pickBody(
  records: readonly BodyRecord[],
  rnd: () => number,
  exclude?: Id,
): BodyRecord | undefined {
  const pool = exclude === undefined
    ? records
    : records.filter((b) => b.id !== exclude);
  if (pool.length === 0) return undefined;
  return pool[Math.floor(rnd() * pool.length)]!;
}

/**
 * Fills the workshop with many dynamic bodies and a mix of springs, ropes,
 * hinges, and pulleys. Uses a time-based seed on each load so re-selecting
 * the scene from the menu yields a new layout.
 */
export function random(world: World, seed?: number): void {
  const rnd = mulberry32(seed ?? defaultSeed());
  addWorkshopEnclosure(world);

  const targetCount = 26 + Math.floor(rnd() * 22);
  const records: BodyRecord[] = [];
  let guard = 0;

  while (records.length < targetCount && guard < targetCount * 25) {
    guard += 1;
    const x = (rnd() * 2 - 1) * INNER_X;
    const y = INNER_Y_MIN + rnd() * (INNER_Y_MAX - INNER_Y_MIN);
    const roll = rnd();

    if (roll < 0.52) {
      const radius = 0.16 + rnd() * 0.22;
      if (tooClose(x, y, radius, records)) continue;
      const mat = pickMaterial(rnd);
      const qRoll = rnd();
      const charge = qRoll < 0.14
        ? (rnd() < 0.5 ? 1 : -1) * (2 + Math.floor(rnd() * 6))
        : undefined;
      const id = world.add(
        ball({
          position: { x, y },
          radius,
          material: mat,
          charge,
          angle: (rnd() * 2 - 1) * Math.PI,
          velocity: {
            x: (rnd() * 2 - 1) * 0.35,
            y: (rnd() * 2 - 1) * 0.25,
          },
        }),
      );
      records.push({
        id,
        kind: "ball",
        x,
        y,
        clearance: radius,
        radius,
      });
    } else if (roll < 0.88) {
      const w = 0.28 + rnd() * 0.62;
      const h = 0.28 + rnd() * 0.58;
      const clearance = Math.hypot(w, h) * 0.5;
      if (tooClose(x, y, clearance, records)) continue;
      const mat = pickMaterial(rnd);
      const qRoll = rnd();
      const charge = qRoll < 0.08
        ? (rnd() < 0.5 ? 1 : -1) * (2 + Math.floor(rnd() * 5))
        : undefined;
      const id = world.add(
        box({
          position: { x, y },
          width: w,
          height: h,
          material: mat,
          charge,
          angle: (rnd() * 2 - 1) * Math.PI,
          velocity: {
            x: (rnd() * 2 - 1) * 0.25,
            y: (rnd() * 2 - 1) * 0.2,
          },
        }),
      );
      records.push({ id, kind: "box", x, y, clearance, radius: clearance });
    } else {
      const radius = 0.22 + rnd() * 0.16;
      if (tooClose(x, y, radius, records)) continue;
      const dipole = (rnd() < 0.5 ? 1 : -1) * (5 + rnd() * 9);
      const id = world.add(
        magnet({
          position: { x, y },
          radius,
          dipole,
          material: "metal",
          angle: (rnd() * 2 - 1) * Math.PI,
          velocity: {
            x: (rnd() * 2 - 1) * 0.2,
            y: (rnd() * 2 - 1) * 0.18,
          },
        }),
      );
      records.push({
        id,
        kind: "magnet",
        x,
        y,
        clearance: radius,
        radius,
      });
    }
  }

  const balls = records.filter((b) => b.kind === "ball");
  const constraintTarget = 16 + Math.floor(rnd() * 20);
  let constraintsAdded = 0;
  let cAttempts = 0;
  const maxConstraintAttempts = Math.max(constraintTarget * 10, 80);

  while (constraintsAdded < constraintTarget && cAttempts < maxConstraintAttempts) {
    cAttempts += 1;
    const t = rnd();
    const a = pickBody(records, rnd);
    if (!a) break;

    let ok = false;
    try {
      if (t < 0.38) {
        const ax = a.x + (rnd() * 2 - 1) * 0.35;
        const rest = 0.65 + rnd() * 1.75;
        world.addConstraint(
          spring({
            a: worldAnchor({ x: ax, y: CEILING_ANCHOR_Y }),
            b: bodyAnchor(a.id),
            restLength: rest,
            frequencyHz: 1.8 + rnd() * 2.8,
            dampingRatio: 0.35 + rnd() * 0.45,
          }),
        );
        ok = true;
      } else if (t < 0.72) {
        const ax = a.x + (rnd() * 2 - 1) * 0.5;
        const ceiling = { x: ax, y: CEILING_ANCHOR_Y };
        const dx = a.x - ceiling.x;
        const dy = a.y - ceiling.y;
        const dist = Math.hypot(dx, dy);
        const length = Math.max(1.1, dist * (0.92 + rnd() * 0.12));
        const segments = 8 + Math.floor(rnd() * 10);
        world.addConstraint(
          rope({
            a: worldAnchor(ceiling),
            b: bodyAnchor(a.id),
            length,
            segments,
            material: rnd() < 0.5 ? "wood" : "metal",
          }),
        );
        ok = true;
      } else if (t < 0.86) {
        const b = pickBody(records, rnd, a.id);
        if (b) {
          const wx = (a.x + b.x) * 0.5 + (rnd() * 2 - 1) * 0.12;
          const wy = (a.y + b.y) * 0.5 + (rnd() * 2 - 1) * 0.12;
          world.addConstraint(
            hinge({
              bodyA: a.id,
              bodyB: b.id,
              worldAnchor: { x: wx, y: wy },
            }),
          );
          ok = true;
        }
      } else if (t < 0.93) {
        const wx = a.x + (rnd() * 2 - 1) * 0.15;
        const wy = a.y + (rnd() * 2 - 1) * 0.12;
        world.addConstraint(
          hinge({
            bodyA: a.id,
            worldAnchor: { x: wx, y: wy },
          }),
        );
        ok = true;
      } else if (balls.length >= 2) {
        const i = Math.floor(rnd() * balls.length);
        let j = Math.floor(rnd() * balls.length);
        if (j === i) j = (j + 1) % balls.length;
        const b0 = balls[i]!;
        const b1 = balls[j]!;
        if (b0.id !== b1.id) {
          const cx = (b0.x + b1.x) * 0.5 + (rnd() * 2 - 1) * 0.25;
          const maxY = Math.max(b0.y, b1.y);
          const cy = maxY + 0.55 + rnd() * 0.85;
          world.addConstraint(
            pulley({
              wheelCenter: { x: cx, y: cy },
              bodyA: b0.id,
              bodyB: b1.id,
              localAnchorA: { x: 0, y: b0.radius },
              localAnchorB: { x: 0, y: b1.radius },
            }),
          );
          ok = true;
        }
      }
    } catch {
      /* Over-constrained or invalid anchor — skip this draw. */
    }
    if (ok) constraintsAdded += 1;
  }
}
