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
  latex: 0xc4b8b0,
  latexSheen: 0x9e9288,

  fieldE: 0x3f6e8c,
  fieldB: 0xa06a3f,
  chargePos: 0x9c4a3a,
  chargeNeg: 0x3a567a,
  magnetN: 0x9c4a3a,
  magnetS: 0x3a567a,

  /** Game-mode accents. */
  accent: 0x3a8c5e,
  accentEdge: 0x2a6e47,
  goalZone: 0xc99a2e,
  goalZoneEdge: 0xa57a1c,
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
  latex: { fill: palette.latex, edge: palette.latexSheen },
};

/** Structural shape of a palette — both `palette` and `cartoonPalette`
 *  conform to this. We can't use `typeof palette` directly because the
 *  workshop palette is declared `as const` (literal-typed values). */
export type Palette = Readonly<Record<keyof typeof palette, number>>;

/** Saturated cartoon palette — used when the renderer is in puzzle mode. */
export const cartoonPalette: Palette = {
  paper: 0xfffaea,
  paperShade: 0xffe9c2,
  inkPrimary: 0x2b2233,
  inkMuted: 0x6b5a6e,
  rule: 0xe7d6b4,

  wood: 0xf4b860,
  woodGrain: 0xa66e33,
  metal: 0xb9c7d6,
  metalEdge: 0x6f84a0,
  cork: 0xf4c58c,
  felt: 0xc9c0e2,
  feltEdge: 0x7e73a3,
  latex: 0xffc8c8,
  latexSheen: 0xff9db8,

  fieldE: 0x4fa8e6,
  fieldB: 0xffb347,
  chargePos: 0xe85a4f,
  chargeNeg: 0x4fa8e6,
  magnetN: 0xe85a4f,
  magnetS: 0x4fa8e6,

  accent: 0x6fcf97,
  accentEdge: 0x3fa974,
  goalZone: 0xffd96b,
  goalZoneEdge: 0xe6a93a,
} as const;

/**
 * Cartoon body fills — single ink outline color and bright saturated fills,
 * which is what reads as "sticker / toy" rather than "tool".
 */
export const cartoonMaterialStyles: Readonly<Record<MaterialName, MaterialStyle>> = {
  wood: { fill: cartoonPalette.wood, edge: cartoonPalette.inkPrimary },
  metal: { fill: cartoonPalette.metal, edge: cartoonPalette.inkPrimary },
  cork: { fill: cartoonPalette.cork, edge: cartoonPalette.inkPrimary },
  felt: { fill: cartoonPalette.felt, edge: cartoonPalette.inkPrimary },
  latex: { fill: cartoonPalette.latex, edge: cartoonPalette.inkPrimary },
};

export type RenderTheme = "workshop" | "cartoon";

export interface ThemeBundle {
  readonly pal: Palette;
  readonly matStyles: typeof materialStyles;
  /** Body outline width (world units) before dividing by camera zoom. */
  readonly outlineWidth: number;
  /** Soft drop-shadow alpha for cartoon-style bodies. */
  readonly shadowAlpha: number;
}

export const themes: Readonly<Record<RenderTheme, ThemeBundle>> = {
  workshop: {
    pal: palette,
    matStyles: materialStyles,
    outlineWidth: stroke.bodyOutline,
    shadowAlpha: opacity.bodyShadow,
  },
  cartoon: {
    pal: cartoonPalette,
    matStyles: cartoonMaterialStyles,
    outlineWidth: 2.4,
    shadowAlpha: 0.18,
  },
};
