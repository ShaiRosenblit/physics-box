import { defaultConfig, type SimulationConfig } from "./config";
import { EventBus, type EventName, type Listener, type Unsubscribe } from "./events";
import { createIdFactory } from "./ids";
import { Stepper } from "./Stepper";
import type { BodySpec, ConstraintSpec, Id, Snapshot, Vec2 } from "./types";
import { PlanckAdapter } from "../adapters/PlanckAdapter";
import { ChargeRegistry } from "../electromagnetism/ChargeRegistry";

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

  constructor(config: SimulationConfig = defaultConfig) {
    this._config = config;
    this._adapter = new PlanckAdapter(config);
    this._stepper = new Stepper(config.dt, config.maxSubsteps);
  }

  /**
   * Tear down the current Planck world, the id factory, the accumulator,
   * and the tick counter. Pre-step hooks and event listeners survive so
   * UI/renderer subscriptions remain valid across scene reloads.
   */
  reset(): void {
    this._adapter = new PlanckAdapter(this._config);
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
    return this._config;
  }

  get tick(): number {
    return this._tick;
  }

  get running(): boolean {
    return this._running;
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
    const charge = spec.charge ?? 0;
    const clamped = clampToCap(charge, this._config.maxCharge);
    const finalSpec = clamped === charge ? spec : { ...spec, charge: clamped };
    const id = this._nextId();
    this._adapter.add(id, finalSpec);
    if (clamped !== 0) this._charges.register(id, clamped);
    this._events.emit("add", { id });
    return id;
  }

  remove(id: Id): void {
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

  /**
   * Begin dragging the dynamic body under the given world point. Returns
   * the dragged body id, or null if no dynamic body is at that point.
   * UI translates pointer events to this command — never mutating bodies
   * directly. Mouse-joint mechanics are an implementation detail of the
   * adapter.
   */
  startDragAt(p: Vec2): Id | null {
    const id = this._adapter.findDynamicBodyAt(p);
    if (id === null) return null;
    return this._adapter.startDrag(id, p) ? id : null;
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
    return this._adapter.buildSnapshot(this._tick, this._tick * this._config.dt);
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
    this._adapter.stepOnce(
      this._config.dt,
      this._config.velIters,
      this._config.posIters,
    );
    this._tick += 1;
    this._events.emit("step", { tick: this._tick });
  }
}

function clampToCap(value: number, cap: number): number {
  if (value > cap) return cap;
  if (value < -cap) return -cap;
  return value;
}
