# Visual Guidelines

The canonical visual reference for Physics Box. The short rules in `.cursor/rules/02-visual.mdc` point here.

## Mood

A warm, tactile physics workshop. Think: wooden bench, brushed metal vise, pencil drawings on aged paper, soft afternoon light from a north window. Calm, deliberate, materially honest.

This is **not**:
- a toy app
- a children's game
- a neon "tech" UI
- an iOS-skeuomorphic surface

## Palette

All colors live as tokens in `src/render/style/palette.ts`. No magic hex strings in components.

### Background and chrome

| Token | Hex | Use |
|---|---|---|
| `paper` | `#F5EFE6` | App background, canvas backdrop |
| `paperShade` | `#EAE2D5` | Panel surfaces, secondary backdrop |
| `inkPrimary` | `#2A2520` | Main text, primary strokes |
| `inkMuted` | `#5A4F43` | Secondary text, labels |
| `rule` | `#D8CFBE` | Dividers, faint grid lines |

### Materials

| Token | Hex | Use |
|---|---|---|
| `wood` | `#A57A4F` | Wooden bodies (boxes, planks) |
| `woodGrain` | `#7E5A36` | Wood detail strokes |
| `metal` | `#B5B0A6` | Brushed metal bodies |
| `metalEdge` | `#80796E` | Metal edge highlights |
| `cork` | `#C8A678` | Soft / springy materials |

### Field lines

| Token | Hex | Use |
|---|---|---|
| `fieldE` | `#3F6E8C` | Electric field streamlines (cool, muted) |
| `fieldB` | `#A06A3F` | Magnetic field streamlines (warm, muted) |
| `chargePos` | `#9C4A3A` | Positive charge marker |
| `chargeNeg` | `#3A567A` | Negative charge marker |
| `magnetN` | `#9C4A3A` | Magnet north pole |
| `magnetS` | `#3A567A` | Magnet south pole |

## Typography

- **System font stack**, no web fonts. Quiet by design.
- **Sizes**: 12 / 14 / 16 px in UI; canvas labels 11 px.
- **Weights**: 400 for body, 500 for labels, 600 for active states. Never bold for emphasis — use color contrast.
- **Tracking**: +0.04em on uppercase eyebrow labels.

## Spacing

A 4px base scale: `4, 8, 12, 16, 24, 32, 48`. Panels use 16. Toolbar items use 8.

## Stroke weights

- **Body outlines**: 1.5px at zoom 1.
- **Field lines**: 1.0px at zoom 1.
- **Grid minor lines**: 0.5px.
- **Grid major lines**: 1.0px.
- **Selection**: 2px, dashed (4-2 pattern).

## Shadows

- **Body shadow**: 0 / 2 / 4px blur, 8% opacity, slight downward offset. Never sharp.
- **Panel shadow**: 0 / 1 / 2px blur, 6% opacity. Used sparingly.

## Motion

- **Panels**: 160ms ease-out for open/close.
- **Selections**: 120ms ease-out for highlight.
- **Camera**: ease-in-out for programmatic moves; pointer pan/zoom is direct (no easing).
- **Forbidden**: spring/bouncy easings, durations over 240ms in UI, anything that draws attention away from the simulation.

## Field-line aesthetics

- Streamlines, not vector arrows.
- Tapered ends (alpha fade over the last ~10% of the line).
- E and B layers are mutually independent; either may be hidden via the View toggles.
- Density: low. The viewer should sense the field shape, not parse a noise pattern.

## Grid

- Subtle dotted or short-dash lines, not solid by default.
- Adaptive density: minor lines fade out below ~8 px screen spacing, major lines fade in above ~80 px.
- The grid is decoration — never the visual focus.

## Selection and handles

- Selection border in `inkPrimary` at 30% opacity, dashed.
- Drag handles (when introduced) are circular dots in `inkMuted`, no fill.

## Materials, procedural first

Wood is a low-amplitude vertical sine grain modulating fill alpha by ±4%.
Brushed metal is a faint horizontal noise modulating fill alpha by ±3%.
No raster textures in MVP. Generate textures only if procedural results are inadequate.
