# Physics Guidelines

Canonical physics spec for Physics Box. The short rules in `.cursor/rules/03-physics.mdc` point here.

## Goals

- **Believable mechanics** via Planck.js (a 2D port of Box2D).
- **Simplified electromagnetism** that is stable, readable, and visually rich.
- **Determinism** for tests and reproducibility.

This is not a research tool. Tuning beats fidelity when they conflict.

## Time

- **Fixed timestep**: `dt = 1/120 s` for accumulator pacing (real-time pump vs logical ticks).
- The kernel uses an accumulator: callers pass real elapsed time to `world.step(dtReal)`, the kernel pumps as many fixed substeps as fit, capped at 8.
- **Simulation rate**: optional `timeScale` on `SimulationConfig` multiplies Planck integration (`dt * timeScale` per substep). `defaultConfig` uses **`timeScale = 1`** (nominal); the desktop shell builds the world with **`playbackTimeScale` (0.5)** so on-screen motion runs slower while tests stay on nominal integration.
- Snapshot **`time = tick * dt * timeScale`** for that world’s config.

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

Each magnet carries a **signed scalar strength** `dipole` (A·m²) and a body **heading** `θ` (Planck angle). The magnetic moment lies **in the simulation plane**:

**m** = dipole × (cos θ, sin θ)

so “north” lies along the body’s local +x axis; a negative strength reverses the vector.

The 3D dipole field **B** = (μ₀_eff / 4π) × (3 (**m**·**r̂**) **r̂** − **m**) / |**r**|³ is evaluated with **m** = (m_x, m_y, 0) and separation **r** = (Δx, Δy, ε), using the same softening length ε as elsewhere. This gives a non-zero **B_z** at points in the sandbox plane so in-plane charges still feel a Lorentz force. Streamlines integrate perpendicular to ∇B_z as before.

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

Magnets feel a **translational** force from the standard point-dipole–dipole interaction (softened separation) and a **scalar torque** τ = (**m** × **B**_peer)·ẑ from the superposed in-plane **B** from other dipoles at the same ε offset. Torque is clamped per tick to `maxEmTorque`.

### Stability rules

- **Force cap** per body per substep: clamp EM force magnitude to `maxEmForce`.
- **Torque cap** per body per substep: clamp |τ| to `maxEmTorque`.
- **Speed cap**: after each Planck substep, clamp each dynamic body’s **linear** velocity magnitude (world XY) to `maxSpeed`.
- **Charge cap** and **dipole cap**: enforced on `add` / `update`.
- **Softening length** `ε` in dipole separation and near-field regularization.

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
- `maxSubsteps`, `maxSpeed`, `maxEmForce`, `maxEmTorque`
- `epsilon` (softening length), `kE`, `mu0Eff`
- `maxCharge`, `maxDipole`, `maxChargedBodies`

Tuning happens here. UI never reads or writes these directly.
