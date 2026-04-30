import type { Vec2 } from "./types";

export interface SimulationConfig {
  readonly gravity: Vec2;
  readonly dt: number;
  /** Multiplier on integration timestep (`Planck.step(dt * timeScale)`). 1 = nominal speed; below 1 slows physics. */
  readonly timeScale: number;
  readonly velIters: number;
  readonly posIters: number;
  readonly maxSubsteps: number;

  readonly maxSpeed: number;
  readonly maxEmForce: number;
  /** Absolute torque clamp per body per EM solve (same units as Planck torque). */
  readonly maxEmTorque: number;

  readonly epsilon: number;
  readonly kE: number;
  readonly mu0Eff: number;

  readonly maxCharge: number;
  readonly maxDipole: number;
  readonly maxChargedBodies: number;

  /** Ambient fluid area density (kg/m²); 0 disables Archimedes lift. Tuned per 2D mass model. */
  readonly fluidDensity: number;
  /** Linear air drag coefficient (N·s/m); F_drag = −coeff × v. 0 disables. */
  readonly fluidLinearDrag: number;
  /** Cap on combined buoyancy + lift + drag force magnitude per body per substep (N). */
  readonly maxBuoyancyForce: number;
  /** Maximum prescriptive upward `buoyancyLift` on a body (N). */
  readonly maxBuoyancyLift: number;
  /** UI / runtime clamp for `fluidDensity` overrides. */
  readonly maxFluidDensity: number;
  readonly maxFluidLinearDrag: number;
}

export const defaultConfig: SimulationConfig = {
  gravity: { x: 0, y: -9.81 },
  dt: 1 / 120,
  timeScale: 1,
  velIters: 8,
  posIters: 3,
  maxSubsteps: 8,

  maxSpeed: 80,
  maxEmForce: 5_000,
  maxEmTorque: 4_000,

  epsilon: 0.05,
  kE: 50,
  mu0Eff: 4,

  maxCharge: 50,
  maxDipole: 50,
  maxChargedBodies: 64,

  fluidDensity: 0,
  fluidLinearDrag: 0,
  maxBuoyancyForce: 4_000,
  maxBuoyancyLift: 200,
  maxFluidDensity: 4,
  maxFluidLinearDrag: 25,
};

/** Passed by the UI shell so playback feels calmer; kernel tests use `defaultConfig` (timeScale 1). */
export const playbackTimeScale = 0.5;
