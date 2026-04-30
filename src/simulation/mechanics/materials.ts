import type { MaterialName } from "../core/types";

export interface MaterialProps {
  readonly density: number;
  readonly friction: number;
  readonly restitution: number;
}

export const materials: Readonly<Record<MaterialName, MaterialProps>> = {
  wood: { density: 0.6, friction: 0.5, restitution: 0.2 },
  metal: { density: 7.8, friction: 0.3, restitution: 0.1 },
  cork: { density: 0.2, friction: 0.7, restitution: 0.5 },
  /** Dead, grabby contact — workshop pin cushion / matte peg wrap (Galton nails). */
  felt: { density: 2.4, friction: 1.45, restitution: 0.01 },
};

export function lookupMaterial(name: MaterialName | undefined): MaterialProps {
  return materials[name ?? "wood"];
}
