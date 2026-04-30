# Physics Box

A 2D physics sandbox in the spirit of *The Incredible Machine*. Warm, tactile, slightly industrial. Real mechanics, simplified electromagnetism.

## Status

Pre-alpha. Building toward a sandbox MVP with charged balls, magnets, ropes, hinges, and springs.

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
npm run test       # run Vitest suites once
npm run test:watch # watch mode
npm run build      # typecheck + production build
```

## Development workflow

- Milestone-driven (M0 … M8). Conventional Commits. One commit = one meaningful step.
- See [`.cursor/rules/04-workflow.mdc`](.cursor/rules/04-workflow.mdc).
