import type { MaterialName } from "../core/types";

export interface MaterialProps {
  readonly density: number;
  readonly friction: number;
  readonly restitution: number;
  /**
   * True for ferromagnetic metals (iron/steel-like). Such bodies are pulled
   * toward magnets regardless of pole, but never carry their own dipole.
   * Non-magnetic materials (wood, cork, felt, latex) ignore magnetic fields.
   */
  readonly ferromagnetic: boolean;
}

export const materials: Readonly<Record<MaterialName, MaterialProps>> = {
  wood: { density: 0.6, friction: 0.5, restitution: 0.2, ferromagnetic: false },
  metal: { density: 7.8, friction: 0.3, restitution: 0.1, ferromagnetic: true },
  cork: { density: 0.2, friction: 0.7, restitution: 0.5, ferromagnetic: false },
  /** Dead, grabby contact — workshop pin cushion / matte peg wrap (Galton nails). */
  felt: { density: 2.4, friction: 1.45, restitution: 0.01, ferromagnetic: false },
  /** Thin film — balloon envelope; low area density. */
  latex: { density: 0.04, friction: 0.45, restitution: 0.35, ferromagnetic: false },
};

export function lookupMaterial(name: MaterialName | undefined): MaterialProps {
  return materials[name ?? "wood"];
}

export function isFerromagnetic(name: MaterialName | undefined): boolean {
  return materials[name ?? "wood"].ferromagnetic;
}
