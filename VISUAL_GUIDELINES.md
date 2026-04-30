# Visual Guidelines

The canonical visual reference for Physics Box. The short rules in `.cursor/rules/02-visual.mdc` point here.

## Vision reference (mood, not a spec)

There is a **directional mood board** (AI-generated “SANDBOX”-style workshop): dim workshop lighting, a physically readable **stage** (wood, worn metal, rope, springs), and a **dark, slightly transparent** digital frame around it (toolbars, inspector, playback). Treat it as **atmosphere**, not pixel-perfect law: the product rules still apply (calm workshop, believable physics, no candy-neon UI).

What to borrow from that direction:

- **Readability through light**: the simulation reads as a lit **bench** or stage; chrome can sit darker so the eye rests on bodies and fields.
- **Material honesty on bodies**: wood grain, cast metal, fiber rope, and coil springs may eventually be **raster or baked shading** where pure vector fills feel flat.
- **Functional accents only**: red/blue (and similar) for charge and poles stay **muted** in the sense of the palette tokens — glow and bloom, if any, are **subtle** and in service of field reading, not decoration.
- **UI as glass over the bench**: panels can use soft transparency, thin rules, and quiet metallic or inset depth — without loud skeuomorphism in every control.

The current app may still use the light `paper` chrome from the token file; moving toward the mood board is a **gradual** alignment (tokens and components), not a single breaking change.

## Mood

A warm, tactile physics workshop. Think: wooden bench, brushed or cast metal, rope and springs, soft directional light and contact shadows — whether drawn procedurally or from textures. Calm, deliberate, materially honest.

This is **not**:

- a toy app
- a children’s game
- a saturated-neon “tech” UI
- gratuitous ornament (gears-for-show, emoji chrome)

## Layers: stage vs chrome

| Layer | Role | Typical treatment |
| --- | --- | --- |
| **Stage** | Bodies, constraints, bench backdrop, pegboard/grid as *environment* | Mix of procedural drawing and **image assets** where detail matters (see below). Lighting and shadow language should stay **consistent** across assets. |
| **Fields** | E/B streamlines, charge readouts | Mostly procedural lines; optional **soft outer glow** if it stays thin and readable at zoom 1. |
| **Chrome** | Toolbar, inspector, playback, dialogs | Mostly code (CSS/layout) and **tokens**. Small **icons** may be raster or SVG; **tool thumbnails** may be pre-rendered sprites matching the stage look. |

Keep **physics state out of React** (architecture rule); this document only governs **appearance** and **asset hosting**.

## Code vs image-based elements

**Prefer procedural / code-first** when:

- Shapes are simple (circles, boxes, basic magnets).
- You only need flat fills with light grain or noise (current bodies).
- Field lines and grids need to scale and recolor with zoom and toggles.

**Introduce raster (PNG/WebP with alpha, or SVG from exported art) when:**

- A body or tool needs **recognizable craft** (rope fiber, spring coils, crate strapping, horseshoe magnet read).
- The **toolbar or welcome** experience benefits from a **thumbnail** that matches the stage’s lighting and materials.
- A **backdrop** (bench top, pegboard) needs photographic or painted detail that would be noisy to maintain in code.

**Rule of thumb:** if users should *name the object at a glance* from its silhouette and surface, and code-only drawing fights that, plan for an asset.

## Asset pipeline (including agent-generated art)

This project may use **generated or hand-authored images** as first-class UI and render inputs. Keep the pipeline boring and reviewable.

1. **Authoring**  
   - Images may be produced by an agent or external tool; a human still **approves** contrast, background removal, and consistency with `src/render/style/palette.ts` (or explicit extensions to it).

2. **Resolution**  
   - Target **1× and 2×** where needed: e.g. base PNG at logical size for on-canvas sprites, `@2x` variant for retina toolbars — or a single vector/SVG equivalent when practical.

3. **Naming & layout**  
   - Store under something like `src/render/assets/` or `public/assets/` (follow whatever the repo settles on per milestone); use **semantic names**: `tool-magnet-thumb.png`, `body-spring-base.png`, not `image12.png`.

4. **Consistency**  
   - **One key light direction** and contact-shadow convention across raster props (e.g. top-left key, soft contact shadow downward). Same **muted** reds/blues as tokens for polarity where color appears in the asset.

5. **Integration**  
   - Pixi/UI load assets through existing render/boot paths; **no magic hex** in new components — tint sprites with palette constants when needed.

6. **Versioning**  
   - Prefer **flattened** PNG/WebP checked into git for small sprites; heavy sources (PSD, `.blend`) are optional and live outside or in `design/` only if the team agrees.

Until assets land, placeholders stay procedural; swapping in textures should not require simulation changes.

## Palette

All colors live as tokens in `src/render/style/palette.ts`. No magic hex strings in components.

Extended or **dark-chrome** theme tokens should be added there in a dedicated step rather than scattering literals.

### Background and chrome (current light baseline)

| Token | Hex | Use |
| --- | --- | --- |
| `paper` | `#F5EFE6` | App background, canvas backdrop |
| `paperShade` | `#EAE2D5` | Panel surfaces, secondary backdrop |
| `inkPrimary` | `#2A2520` | Main text, primary strokes |
| `inkMuted` | `#5A4F43` | Secondary text, labels |
| `rule` | `#D8CFBE` | Dividers, faint grid lines |

### Materials

| Token | Hex | Use |
| --- | --- | --- |
| `wood` | `#A57A4F` | Wooden bodies (boxes, planks) |
| `woodGrain` | `#7E5A36` | Wood detail strokes |
| `metal` | `#B5B0A6` | Brushed metal bodies |
| `metalEdge` | `#80796E` | Metal edge highlights |
| `cork` | `#C8A678` | Soft / springy materials |

### Field lines & poles

| Token | Hex | Use |
| --- | --- | --- |
| `fieldE` | `#3F6E8C` | Electric field streamlines (cool, muted) |
| `fieldB` | `#A06A3F` | Magnetic field streamlines (warm, muted) |
| `chargePos` | `#9C4A3A` | Positive charge marker |
| `chargeNeg` | `#3A567A` | Negative charge marker |
| `magnetN` | `#9C4A3A` | Magnet north pole |
| `magnetS` | `#3A567A` | Magnet south pole |

## Typography

- **System font stack**, no web fonts unless explicitly adopted later. Quiet by design.
- **Sizes**: 12 / 14 / 16 px in UI; canvas labels 11 px.
- **Weights**: 400 for body, 500 for labels, 600 for active states. Avoid heavy bold stacks for emphasis — use hierarchy and contrast.
- **Tracking**: +0.04em on uppercase eyebrow labels.

## Spacing

A 4px base scale: `4, 8, 12, 16, 24, 32, 48`. Panels use 16. Toolbar items use 8.

## Stroke weights

- **Body outlines**: 1.5px at zoom 1 (when drawn as vectors).
- **Field lines**: ≤1.0px at zoom 1; cool/warm hues per E/B.
- **Grid minor lines**: 0.5px.
- **Grid major lines**: 1.0px.
- **Selection**: 2px, dashed (4–2 pattern).

## Shadows & depth

- **Body shadow**: soft, low contrast — e.g. small blur, modest opacity, slight downward bias. Raster assets should include **contact** softness compatible with this (no hard comic drop shadows unless temporary).
- **Panel shadow**: very subtle on light chrome; on dark transparent panels prefer **thin highlights** along top edges and faint inner shadow if needed — still restrained.

## Motion

- **Panels**: 160ms ease-out for open/close.
- **Selections**: 120ms ease-out for highlight.
- **Camera**: ease-in-out for programmatic moves; pointer pan/zoom is direct (no easing).
- **Forbidden**: spring/bouncy easings, durations over 240ms for routine UI chrome, motion that steals focus from the simulation.

## Field-line aesthetics

- Streamlines, not dense arrow meshes.
- Tapered ends (alpha fade over the last ~10% of the line).
- Optional **very soft** outer glow matching pole hue — never thick “neon tubing.”
- E and B layers are independent; toggles hide either layer.
- Density: low. The viewer senses field shape, not noise.

## Grid & environment

- Subtle dotted or short-dash lines, not solid by default.
- Adaptive density: minor lines fade out below ~8 px screen spacing, major lines fade in above ~80 px.
- Pegboard/bench textures, if rasterized, stay **secondary** — decoration, never the busiest layer.

## Selection and handles

- Selection border in `inkPrimary` at ~30% opacity, dashed (or equivalent on dark backgrounds).
- Drag handles (when introduced) are small circles in `inkMuted`, minimal fill.

## Materials: procedural first, assets when it earns its keep

- **Default:** wood as low-amplitude vertical grain modulation; brushed metal as faint horizontal noise — as today.
- **Upgrade path:** bake those looks into sprites or layered textures when procedural caps out, **without** changing simulation contracts.
- **Do not** ship one-off heroic art per body without a plan to unify lighting and naming (see Asset pipeline).

## Implementation note

Updating this document does **not** require an immediate visual rewrite. Use it to **prioritize** token extensions,backdrop/tool art, and UI contrast passes in milestone-sized steps (`04-workflow.mdc`).
