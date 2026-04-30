# Physics Guidelines

Canonical physics spec for Physics Box. The short rules in `.cursor/rules/03-physics.mdc` point here.

## Goals

- **Believable mechanics** via Planck.js (a 2D port of Box2D).
- **Simplified electromagnetism** that is stable, readable, and visually rich.
- **Determinism** for tests and reproducibility.

This is not a research tool. Tuning beats fidelity when they conflict.

## Time

- **Fixed timestep**: `dt = 1/120 s`.
- The kernel uses an accumulator: callers pass real elapsed time to `world.step(dtReal)`, the kernel pumps as many fixed substeps as fit, capped at 8.
- `tick: number` advances by 1 per substep. `time = tick * dt`.

## Units

We use **scaled / abstract units** that read as SI:

- length in meters
- mass in kilograms
- time in seconds
- charge in (sandbox) coulombs
- magnetic dipole moment in (sandbox) A·m²

EM constants in `src/simulation/electromagnetism/constants.ts` are tuned for sandbox feel rather than measured.

## Mechanics

### Bodies

- **Ball**: circle fixture. Mass = density × π × r². Defaults: density 1 kg/m², friction 0.3, restitution 0.2.
- **Box**: polygon fixture (rectangle). Same defaults.
- Both can carry an optional `charge` in coulombs.

### Constraints

- **Rope**: chain of small dynamic segments connected by distance joints. Anchorable to bodies or world points.
- **Hinge**: revolute joint between two bodies (or one body and the world).
- **Spring**: distance joint with `frequencyHz` and `dampingRatio` set per material.

### Materials

A small named set in `src/simulation/mechanics/materials.ts` encodes density, friction, and restitution. Bodies pick a material; UI exposes presets.

## Electromagnetism (MVP)

All math is 2D. The magnetic field `B` is treated as a **scalar** representing the out-of-plane component (`B_z`). The electric field `E` is a 2D vector.

### Coulomb force

Between every pair of charged bodies:

```
F_12 = k_e * q1 * q2 * r̂ / (|r|² + ε²)
```

- `k_e` (sandbox) is in `constants.ts`.
- `ε` is a softening length to keep close encounters numerically stable.
- Pairwise O(n²). The kernel caps the number of charged bodies (default 64) and emits a warning above that.

### Magnets and B field

A magnet is a body with a 2D scalar dipole moment `m` (signed). For evaluation we use the 2D point-dipole reduction:

```
B(r) = (μ₀_eff / 2π) * ((2 (m·r̂) r̂ - m) / |r|³)
```

In the scalar-B treatment `B(r)` is taken as the out-of-plane component of this vector form, plus softening near sources.

### Lorentz force

For each charged body in the sampled B field:

```
F = q (v × B)
```

In 2D with scalar `B`:

```
F = q * B * ( v.y, -v.x )       // sign per chosen convention, documented in code
```

### Dipole-on-dipole (M7)

A magnet in another magnet's field experiences both a force and a torque (the latter via `τ = m × B`, scalar in 2D). Computed pairwise after the B field is sampled at each magnet's center.

### Stability rules

- **Force cap** per body per substep: clamp EM force magnitude to `maxEmForce`.
- **Speed cap**: clamp body speed to `maxSpeed`.
- **Charge cap** and **dipole cap**: enforced on `add` / `update`.
- **Softening length** `ε` in every `1/r` and `1/r²` denominator.

These caps are documented in `src/simulation/core/config.ts` and visible (read-only) in the inspector.

## What is explicitly NOT modelled

- Induced currents and self-induction.
- B field from moving charges (no Biot-Savart).
- Time-varying E from time-varying B (no Faraday).
- Maxwell displacement current.
- Relativistic effects.

These are listed so that requests to add them are answered consistently: not in MVP.

## Determinism

- EM forces are computed in stable id order before each Planck substep.
- No `Math.random` in the kernel. Any randomness is via a seeded RNG accepted through config.
- Same initial spec + same command stream + same `dt` ⇒ identical tick-by-tick `Snapshot` objects (positions match within float epsilon).
- `src/simulation/tests/determinism.test.ts` exercises this and must stay green.

## Configuration

`src/simulation/core/config.ts` exports a single `defaultConfig` object collecting:

- `gravity`, `dt`, `velIters`, `posIters`
- `maxSubsteps`, `maxSpeed`, `maxEmForce`
- `epsilon` (softening length), `kE`, `mu0Eff`
- `maxCharge`, `maxDipole`, `maxChargedBodies`

Tuning happens here. UI never reads or writes these directly.
