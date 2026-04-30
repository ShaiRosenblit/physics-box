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
};

/** Passed by the UI shell so playback feels calmer; kernel tests use `defaultConfig` (timeScale 1). */
export const playbackTimeScale = 0.5;
