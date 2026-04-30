import { clampToSymmetricCap } from "../core/bodyPatch";
import type { Id } from "../core/types";

export interface EngineTorqueInput {
  readonly id: Id;
  readonly torque: number;
  /** False for static/kinematic bodies or when `fixed` — no drive applied. */
  readonly active: boolean;
}

/**
 * Builds a per-substep motor torque map in stable body-id order.
 * Magnitudes are clamped to `maxAbsTorque`; inactive bodies are skipped.
 */
export function buildEngineTorqueMap(
  inputs: readonly EngineTorqueInput[],
  maxAbsTorque: number,
): Map<Id, number> {
  const sorted = [...inputs].sort((a, b) => a.id - b.id);
  const out = new Map<Id, number>();
  for (const e of sorted) {
    if (!e.active) continue;
    const t = clampToSymmetricCap(e.torque, maxAbsTorque);
    if (t !== 0) out.set(e.id, t);
  }
  return out;
}
