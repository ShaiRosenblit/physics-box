# Physics Box

A 2D physics sandbox in the spirit of *The Incredible Machine*. Warm, tactile, slightly industrial. Real mechanics, simplified electromagnetism.

## Status

Sandbox MVP complete. The welcome scene drops you into a workshop with a hanging rope, a hinged seesaw, a vertical spring, a charged-ball pair, and a north/south magnet pair — playing immediately so you see real mechanics, electric streamlines, and magnetic field flows in motion.

### What works today

- **Mechanics**: balls, boxes, ropes (segmented), revolute hinges, spring constraints. Wood, metal, cork material presets.
- **Electromagnetism**: Coulomb force between charged bodies, Lorentz force on charges in magnetic fields, scalar B field with pairwise magnet forces. All capped for stability and stable in id order for determinism.
- **Visualization**: thin streamlines for the E field, level-curve flows for the B field. Both toggleable from the toolbar; auto-disabled when the scene has no sources.
- **Interaction**: click-to-spawn (Ball, Box, Ball ±, Magnet N/S), drag dynamic bodies via a kernel-side mouse joint, play / pause / step / reset.
- **Inspector**: live position, velocity, angle, charge, dipole for the selected body.

## Stack

- TypeScript, Vite
- React (UI only)
- PixiJS (rendering only)
- Planck.js (physics, wrapped behind a single adapter)
- Vitest (kernel tests)

## Architecture at a glance

```
ui  ──commands──▶  simulation  ──snapshots──▶  render
                       │
                       └── only PlanckAdapter imports `planck`
```

The simulation kernel is **headless and pure**: no React, no Pixi, no DOM. UI never mutates physics state — it issues commands; render reads immutable per-frame snapshots.

See [`.cursor/rules/01-architecture.mdc`](.cursor/rules/01-architecture.mdc) for the full boundary law.

## Project layout

```
src/
  simulation/        # headless kernel — no DOM, no React, no Pixi
    core/            # World, Stepper, types, config
    mechanics/       # Ball, Box, Rope, Hinge, Spring, Magnet factories
    electromagnetism/# Coulomb, Lorentz, magnets, field sampling
    adapters/        # PlanckAdapter (only place that imports planck)
    scenes/          # named scene factories (welcome, empty, …)
    tests/           # Vitest suites
  render/            # Pixi scene, camera, palette tokens
  ui/                # React shell, panels, hooks, store
```

## Guidelines

- [`VISUAL_GUIDELINES.md`](VISUAL_GUIDELINES.md) — palette, spacing, motion, field-line aesthetics.
- [`PHYSICS_GUIDELINES.md`](PHYSICS_GUIDELINES.md) — units, timestep, EM model, determinism.

## Scripts

```bash
npm install        # install deps
npm run dev        # start dev server (Vite)
npm run typecheck  # TypeScript project references typecheck
npm run test       # run Vitest kernel suites once
npm run test:watch # watch mode
npm run test:e2e   # run Playwright UI smoke (chromium)
npm run build      # typecheck + production build
npm run preview    # serve the production build locally
```

## Responsive shell and touch

The shell adapts to three viewport modes (driven by a `useViewportMode` hook
backed by `matchMedia`):

- **Desktop ≥ 1024 px** — labelled `Toolbar` and `Inspector` flank the canvas.
- **Tablet 640–1023 px** — both panels collapse to 44 px icon rails so the
  canvas always dominates.
- **Phone < 640 px** — full-bleed canvas with two floating buttons; tapping
  either slides in a `Drawer` (`Toolbar` from the left, `Inspector` from
  the bottom). Selecting a body auto-opens the inspector sheet.

Canvas pointer events are owned by `usePointerGestures` (one-finger drag/pan/tap,
two-finger pinch + pan with `touch-action: none`); the existing
`CameraController` keeps mouse-wheel zoom and middle/right-button drag for
desktop. See `src/ui/hooks/useViewportMode.ts`,
`src/ui/canvas/usePointerGestures.ts`, and `src/ui/components/Drawer.tsx`.

## Deploying

The build is a static SPA — any host that serves `dist/` works.

- **Vercel**: set framework preset to *Vite*, leave defaults. The relative
  `base: "./"` in `vite.config.ts` makes the build work from any URL prefix.
- **Netlify**: build command `npm run build`, publish directory `dist`.
- **GitHub Pages** (project pages): `BASE_PATH=/your-repo/ npm run build`,
  then publish `dist/`.

The mobile shell ships the right `viewport`, `theme-color`, and a Web App
Manifest (`public/manifest.webmanifest`) so the app installs cleanly to a
phone home screen.

The Playwright smoke spec doubles as the workflow rule's "Playwright MCP smoke pass" — it asserts presence/labels of the toolbar, inspector, playback bar, and canvas, plus playback semantics (advance, pause, step, reset). It also captures a reference screenshot at `tests/smoke/screenshots/welcome.png`.

## Development workflow

- Milestone-driven (M0 … M8 complete). Conventional Commits. One commit = one meaningful step.
- See [`.cursor/rules/04-workflow.mdc`](.cursor/rules/04-workflow.mdc).
