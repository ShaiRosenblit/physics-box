/**
 * The single source of truth for color tokens.
 * Reflects VISUAL_GUIDELINES.md. Do not introduce magic hex strings
 * elsewhere in the render layer or UI.
 */
export const palette = {
  paper: 0xf5efe6,
  paperShade: 0xeae2d5,
  inkPrimary: 0x2a2520,
  inkMuted: 0x5a4f43,
  rule: 0xd8cfbe,

  wood: 0xa57a4f,
  woodGrain: 0x7e5a36,
  metal: 0xb5b0a6,
  metalEdge: 0x80796e,
  cork: 0xc8a678,
  felt: 0x928d84,
  feltEdge: 0x656059,

  fieldE: 0x3f6e8c,
  fieldB: 0xa06a3f,
  chargePos: 0x9c4a3a,
  chargeNeg: 0x3a567a,
  magnetN: 0x9c4a3a,
  magnetS: 0x3a567a,
} as const;

export const stroke = {
  bodyOutline: 1.5,
  fieldLine: 1.0,
  gridMinor: 0.5,
  gridMajor: 1.0,
  selection: 2.0,
} as const;

export const opacity = {
  gridMinor: 0.45,
  gridMajor: 0.7,
  bodyShadow: 0.08,
  panelShadow: 0.06,
  selection: 0.3,
} as const;

import type { MaterialName } from "../../simulation";

interface MaterialStyle {
  readonly fill: number;
  readonly edge: number;
}

export const materialStyles: Readonly<Record<MaterialName, MaterialStyle>> = {
  wood: { fill: palette.wood, edge: palette.woodGrain },
  metal: { fill: palette.metal, edge: palette.metalEdge },
  cork: { fill: palette.cork, edge: palette.woodGrain },
  felt: { fill: palette.felt, edge: palette.feltEdge },
};
