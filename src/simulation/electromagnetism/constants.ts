/**
 * Sandbox EM constants, re-exported as a small typed shape so solvers
 * don't grab them piecemeal from the global config. The numbers
 * themselves live in `core/config.ts` — this file selects + reshapes.
 */
import type { SimulationConfig } from "../core/config";

export interface EmConstants {
  readonly kE: number;
  readonly mu0Eff: number;
  readonly kFerro: number;
  readonly epsilon: number;
  readonly maxEmForce: number;
  readonly maxEmTorque: number;
}

export function emConstants(config: SimulationConfig): EmConstants {
  return {
    kE: config.kE,
    mu0Eff: config.mu0Eff,
    kFerro: config.kFerro,
    epsilon: config.epsilon,
    maxEmForce: config.maxEmForce,
    maxEmTorque: config.maxEmTorque,
  };
}
