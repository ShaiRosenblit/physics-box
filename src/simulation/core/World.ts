import { defaultConfig, type SimulationConfig } from "./config";
import type { BodySpec, Id, Snapshot } from "./types";

/**
 * The simulation kernel facade.
 *
 * M0 stub: structure is in place, behavior arrives in M1.
 * Public surface is the only thing UI and render touch.
 */
export class World {
  private readonly _config: SimulationConfig;
  private _tick = 0;

  constructor(config: SimulationConfig = defaultConfig) {
    this._config = config;
  }

  get config(): SimulationConfig {
    return this._config;
  }

  get tick(): number {
    return this._tick;
  }

  step(_dtReal: number): void {
    // M1 will implement the fixed-dt accumulator.
  }

  add(_spec: BodySpec): Id {
    throw new Error("World.add is not implemented yet (lands in M1)");
  }

  remove(_id: Id): void {
    throw new Error("World.remove is not implemented yet (lands in M1)");
  }

  snapshot(): Snapshot {
    return Object.freeze({
      tick: this._tick,
      time: this._tick * this._config.dt,
      bodies: Object.freeze([]),
    });
  }
}
