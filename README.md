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
```

The Playwright smoke spec doubles as the workflow rule's "Playwright MCP smoke pass" — it asserts presence/labels of the toolbar, inspector, playback bar, and canvas, plus playback semantics (advance, pause, step, reset). It also captures a reference screenshot at `tests/smoke/screenshots/welcome.png`.

## Development workflow

- Milestone-driven (M0 … M8 complete). Conventional Commits. One commit = one meaningful step.
- See [`.cursor/rules/04-workflow.mdc`](.cursor/rules/04-workflow.mdc).
