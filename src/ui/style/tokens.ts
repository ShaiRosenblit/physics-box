import { palette } from "../../render/style/palette";

function toHex(rgb: number): string {
  return `#${rgb.toString(16).padStart(6, "0")}`;
}

/** CSS colors derived from the shared render palette (VISUAL_GUIDELINES). */
export const ui = {
  paper: toHex(palette.paper),
  paperShade: toHex(palette.paperShade),
  inkPrimary: toHex(palette.inkPrimary),
  inkMuted: toHex(palette.inkMuted),
  rule: toHex(palette.rule),
  chargePos: toHex(palette.chargePos),
  chargeNeg: toHex(palette.chargeNeg),
  fieldB: toHex(palette.fieldB),
} as const;

export const layout = {
  controlHeight: 26,
  controlRadius: 4,
  controlBorder: 1,
} as const;
