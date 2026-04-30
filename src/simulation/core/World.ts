import { defaultConfig, type SimulationConfig } from "./config";
import { EventBus, type EventName, type Listener, type Unsubscribe } from "./events";
import { createIdFactory } from "./ids";
import { Stepper } from "./Stepper";
import type { BodySpec, Id, Snapshot } from "./types";
import { PlanckAdapter } from "../adapters/PlanckAdapter";

/**
 * The simulation kernel facade.
 *
 * Public surface is the only thing UI and render touch. UI issues
 * commands (add/remove/step/pause/...). Render reads `snapshot()`.
 * EM force solvers (M6+) plug in via the substep advance closure.
 */
export class World {
  private readonly _config: SimulationConfig;
  private readonly _adapter: PlanckAdapter;
  private readonly _stepper: Stepper;
  private readonly _events = new EventBus();
  private readonly _nextId = createIdFactory();
  private readonly _preStepHooks: Array<() => void> = [];

  private _tick = 0;
  private _running = true;

  constructor(config: SimulationConfig = defaultConfig) {
    this._config = config;
    this._adapter = new PlanckAdapter(config);
    this._stepper = new Stepper(config.dt, config.maxSubsteps);
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
    const id = this._nextId();
    this._adapter.add(id, spec);
    this._events.emit("add", { id });
    return id;
  }

  remove(id: Id): void {
    if (!this._adapter.has(id)) return;
    this._adapter.remove(id);
    this._events.emit("remove", { id });
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
