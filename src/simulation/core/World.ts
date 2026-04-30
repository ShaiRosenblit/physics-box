import {
  defaultConfig,
  playbackTimeScaleMax,
  playbackTimeScaleMin,
  type SimulationConfig,
} from "./config";
import { EventBus, type EventName, type Listener, type Unsubscribe } from "./events";
import { createIdFactory } from "./ids";
import { Stepper } from "./Stepper";
import type {
  BodyPatch,
  BodySpec,
  ConstraintPatch,
  ConstraintSpec,
  Id,
  Snapshot,
  Vec2,
} from "./types";
import {
  anchorBottomEdgeOnHeightChange,
  clampBodySpecToConfig,
  mergeBodyPatch,
} from "./bodyPatch";
import {
  mergeConstraintPatch,
  sanitizeConstraintSpec,
} from "./constraintPatch";
import { CONSTRAINT_PICK_RADIUS, pickClosestConstraint } from "./constraintHit";
import { PlanckAdapter } from "../adapters/PlanckAdapter";
import { ChargeRegistry } from "../electromagnetism/ChargeRegistry";
import { computeCoulombForces } from "../electromagnetism/coulomb";
import { emConstants } from "../electromagnetism/constants";
import { sampleE } from "../electromagnetism/field";
import {
  computeLorentzForces,
  computeMagnetPairForces,
  computeMagnetPairTorques,
} from "../electromagnetism/lorentz";
import { sampleB } from "../electromagnetism/magnetism";
import { computeBuoyancyForces } from "../mechanics/buoyancy";
import { buildEngineTorqueMap } from "../mechanics/motor";

/**
 * The simulation kernel facade.
 *
 * Public surface is the only thing UI and render touch. UI issues
 * commands (add/remove/step/pause/...). Render reads `snapshot()`.
 * EM force solvers (M6+) plug in via the substep advance closure.
 */
export class World {
  private readonly _config: SimulationConfig;
  private _adapter: PlanckAdapter;
  private readonly _stepper: Stepper;
  private readonly _events = new EventBus();
  private _nextId = createIdFactory();
  private readonly _preStepHooks: Array<() => void> = [];
  private readonly _charges = new ChargeRegistry();

  private _tick = 0;
  private _running = true;
  private _gravityEnabled = true;
  /** Planck timestep multiplier; may be adjusted at runtime (`setTimeScale`). Survives `reset()`. */
  private _timeScale: number;
  /** Runtime overrides; re-seeded from `SimulationConfig` on `reset()`. */
  private _fluidDensity: number;
  private _fluidLinearDrag: number;

  constructor(config: SimulationConfig = defaultConfig) {
    this._config = config;
    this._timeScale = config.timeScale;
    this._fluidDensity = config.fluidDensity;
    this._fluidLinearDrag = config.fluidLinearDrag;
    this._adapter = new PlanckAdapter(config);
    this._stepper = new Stepper(config.dt, config.maxSubsteps);
    this.registerEmSolvers();
    this.registerBuoyancySolver();
    this.registerEngineSolver();
  }

  private registerEmSolvers(): void {
    this._preStepHooks.push(() => {
      const ec = emConstants(this._config);
      const charges = this._charges.size() === 0
        ? []
        : this._adapter.collectChargedBodies().sort((a, b) => a.id - b.id);
      const magnets = this._adapter.collectMagnets().sort((a, b) => a.id - b.id);

      if (charges.length >= 2) {
        const f = computeCoulombForces(charges, ec);
        this._adapter.applyForces(f);
      }
      if (charges.length > 0 && magnets.length > 0) {
        const f = computeLorentzForces(charges, magnets, ec);
        if (f.size > 0) this._adapter.applyForces(f);
      }
      if (magnets.length >= 2) {
        const f = computeMagnetPairForces(magnets, ec);
        if (f.size > 0) this._adapter.applyForces(f);
        const tau = computeMagnetPairTorques(magnets, ec);
        if (tau.size > 0) this._adapter.applyTorques(tau);
      }
    });
  }

  private registerBuoyancySolver(): void {
    this._preStepHooks.push(() => {
      const cfg = this.config;
      const gVec = this._gravityEnabled ? this._config.gravity : { x: 0, y: 0 };
      const raw = this._adapter.collectBuoyantBodies();
      if (raw.length === 0) return;
      const sorted = [...raw].sort((a, b) => a.id - b.id);
      let anyLift = false;
      for (const b of sorted) {
        if (b.buoyancyLift > 0) {
          anyLift = true;
          break;
        }
      }
      if (cfg.fluidDensity <= 0 && cfg.fluidLinearDrag <= 0 && !anyLift) return;

      const f = computeBuoyancyForces(sorted, gVec, cfg);
      if (f.size > 0) this._adapter.applyForces(f);
    });
  }

  private registerEngineSolver(): void {
    this._preStepHooks.push(() => {
      const inputs = this._adapter.engineTorqueInputs();
      if (inputs.length === 0) return;
      const tau = buildEngineTorqueMap(inputs, this._config.maxMotorTorque);
      if (tau.size > 0) this._adapter.applyTorques(tau);
    });
  }

  /**
   * Sample the electric and magnetic fields at the given world point.
   * E is a 2D vector (V/m), B is a scalar (out-of-plane component).
   */
  sampleField(p: Vec2): { readonly E: Vec2; readonly B: number } {
    const ec = emConstants(this._config);
    const charges = this._charges.size() === 0
      ? []
      : this._adapter.collectChargedBodies().sort((a, b) => a.id - b.id);
    const magnets = this._adapter.collectMagnets().sort((a, b) => a.id - b.id);
    return {
      E: charges.length === 0 ? { x: 0, y: 0 } : sampleE(p, charges, ec),
      B: magnets.length === 0 ? 0 : sampleB(p, magnets, ec),
    };
  }

  /**
   * Tear down the current Planck world, the id factory, the accumulator,
   * and the tick counter. Pre-step hooks and event listeners survive so
   * UI/renderer subscriptions remain valid across scene reloads.
   */
  reset(): void {
    this._adapter = new PlanckAdapter(this._config);
    this.applyGravityToAdapter();
    this._fluidDensity = this._config.fluidDensity;
    this._fluidLinearDrag = this._config.fluidLinearDrag;
    this._stepper.reset();
    this._charges.clear();
    this._nextId = createIdFactory();
    this._tick = 0;
    this._running = true;
  }

  /** @internal — used by EM solvers and the field-sampling helper. */
  get adapter(): PlanckAdapter {
    return this._adapter;
  }

  /** @internal — exposed for EM solvers and tests. */
  get charges(): ChargeRegistry {
    return this._charges;
  }

  get config(): SimulationConfig {
    return {
      ...this._config,
      timeScale: this._timeScale,
      fluidDensity: this._fluidDensity,
      fluidLinearDrag: this._fluidLinearDrag,
    };
  }

  setTimeScale(value: number): void {
    if (!Number.isFinite(value)) return;
    this._timeScale = Math.max(
      playbackTimeScaleMin,
      Math.min(playbackTimeScaleMax, value),
    );
  }

  setFluidDensity(value: number): void {
    if (!Number.isFinite(value)) return;
    const v = Math.max(0, Math.min(this._config.maxFluidDensity, value));
    this._fluidDensity = v;
  }

  setFluidLinearDrag(value: number): void {
    if (!Number.isFinite(value)) return;
    const v = Math.max(0, Math.min(this._config.maxFluidLinearDrag, value));
    this._fluidLinearDrag = v;
  }

  get tick(): number {
    return this._tick;
  }

  get running(): boolean {
    return this._running;
  }

  get gravityEnabled(): boolean {
    return this._gravityEnabled;
  }

  /**
   * When disabled, Planck gravity is set to zero while preserving the
   * configured vector for re-enable. Survives `reset()` and scene reloads.
   */
  setGravityEnabled(enabled: boolean): void {
    if (enabled === this._gravityEnabled) return;
    this._gravityEnabled = enabled;
    this.applyGravityToAdapter();
  }

  private applyGravityToAdapter(): void {
    const g = this._gravityEnabled
      ? this._config.gravity
      : { x: 0, y: 0 };
    this._adapter.setGravity(g);
  }

  /** Pump real elapsed time into the fixed-dt accumulator. */
  step(dtReal: number): number {
    if (!this._running) return 0;
    return this._stepper.pump(dtReal, () => this.advance());
  }

  /** Force exactly one fixed substep regardless of pause / accumulator. */
  stepOnce(): void {
    this._stepper.advanceOnce(() => this.advance());
  }

  pause(): void {
    this._running = false;
  }

  resume(): void {
    this._running = true;
  }

  add(spec: BodySpec): Id {
    const finalSpec = clampBodySpecToConfig(spec, this._config);
    if (finalSpec.kind === "engine") {
      const housingId = this._nextId();
      const rotorId = this._nextId();
      this._adapter.addEnginePair(housingId, rotorId, finalSpec);
      this._charges.register(housingId, finalSpec.charge ?? 0);
      this._charges.register(rotorId, 0);
      this._events.emit("add", { id: housingId });
      this._events.emit("add", { id: rotorId });
      return housingId;
    }
    const id = this._nextId();
    this._adapter.add(id, finalSpec);
    this._charges.register(id, finalSpec.charge ?? 0);
    this._events.emit("add", { id });
    return id;
  }

  /**
   * Sparse body update (charge, material, geometry, fixed, damping, EM, …).
   * Clamps to the same limits as `add`. Pose and velocities stay as-is.
   */
  patchBody(id: Id, patch: BodyPatch): void {
    const housingId = this._adapter.resolveEngineHousingId(id) ?? id;
    if (!this._adapter.has(housingId)) return;
    const prev = this._adapter.getBodySpec(housingId);
    if (!prev) return;
    const merged = mergeBodyPatch(prev, patch);
    const clamped = clampBodySpecToConfig(merged, this._config);
    const next = anchorBottomEdgeOnHeightChange(prev, clamped, patch);
    this._adapter.applyBodySpec(housingId, next);
    this._charges.register(housingId, next.charge ?? 0);
  }

  remove(id: Id): void {
    const hid = this._adapter.resolveEngineHousingId(id);
    if (hid !== null) {
      const removed = this._adapter.removeEngineAssembly(hid);
      for (const rid of removed) {
        this._charges.unregister(rid);
        this._events.emit("remove", { id: rid });
      }
      return;
    }
    if (this._adapter.has(id)) {
      this._adapter.remove(id);
      this._charges.unregister(id);
      this._events.emit("remove", { id });
      return;
    }
    if (this._adapter.hasConstraint(id)) {
      this._adapter.removeConstraint(id);
      this._events.emit("remove", { id });
    }
  }

  addConstraint(spec: ConstraintSpec): Id {
    const id = this._nextId();
    this._adapter.addConstraint(id, spec);
    this._events.emit("add", { id });
    return id;
  }

  patchConstraint(id: Id, patch: ConstraintPatch): void {
    if (!this._adapter.hasConstraint(id)) return;
    const prev = this._adapter.getConstraintSpec(id);
    if (!prev) return;
    const merged = sanitizeConstraintSpec(mergeConstraintPatch(prev, patch));
    this._adapter.applyConstraintSpec(id, merged);
  }

  /**
   * Nearest constraint geometry to `p` within a small edge distance threshold.
   * UI should prefer `bodyAt` first when tapping near dynamic bodies.
   */
  constraintAt(p: Vec2): Id | null {
    return pickClosestConstraint(this.snapshot().constraints, p, CONSTRAINT_PICK_RADIUS);
  }

  /**
   * Read-only hit-test: returns the id of the dynamic body whose fixtures
   * contain `p`, or null. Used by UI gestures (selection, connector
   * anchor placement) where mutating drag state would be wrong.
   */
  bodyAt(p: Vec2): Id | null {
    return this._adapter.findDynamicBodyAt(p);
  }

  /**
   * Begin dragging the dynamic body under the given world point. Returns
   * the dragged body id, or null if no dynamic body is at that point.
   * UI translates pointer events to this command — never mutating bodies
   * directly. Mouse-joint mechanics are an implementation detail of the
   * adapter.
   */
  startDragAt(p: Vec2, opts?: { rotate?: boolean }): Id | null {
    const id = this._adapter.findDynamicBodyAt(p);
    if (id === null) return null;
    const rotate = !!(opts?.rotate && !this._running);
    const teleport = !this._running && !rotate;
    return this._adapter.startDrag(id, p, { teleport, rotate }) ? id : null;
  }

  updateDrag(p: Vec2): void {
    this._adapter.updateDrag(p);
  }

  endDrag(): void {
    this._adapter.endDrag();
  }

  get dragging(): boolean {
    return this._adapter.isDragging;
  }

  snapshot(): Snapshot {
    const dtSim = this._config.dt * this._timeScale;
    return this._adapter.buildSnapshot(this._tick, this._tick * dtSim);
  }

  on<E extends EventName>(event: E, listener: Listener<E>): Unsubscribe {
    return this._events.on(event, listener);
  }

  /**
   * Internal hook for force solvers (Coulomb, Lorentz). Each registered
   * function is invoked once per fixed substep, before the Planck step.
   * Wired in M6+; kept as a clean seam from M1 onward.
   * @internal
   */
  registerPreStep(hook: () => void): Unsubscribe {
    this._preStepHooks.push(hook);
    return () => {
      const i = this._preStepHooks.indexOf(hook);
      if (i >= 0) this._preStepHooks.splice(i, 1);
    };
  }

  private advance(): void {
    for (const hook of this._preStepHooks) hook();
    const dtSim = this._config.dt * this._timeScale;
    this._adapter.stepOnce(
      dtSim,
      this._config.velIters,
      this._config.posIters,
    );
    this._tick += 1;
    this._events.emit("step", { tick: this._tick });
  }
}
