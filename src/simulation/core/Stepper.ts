/**
 * Fixed-dt stepping with a real-time accumulator.
 *
 * The kernel exposes a single `step(dtReal)` entry point. The Stepper
 * drains the accumulator in fixed-size substeps, capped to prevent
 * spiral-of-death when the host is overloaded.
 */
export class Stepper {
  private accumulator = 0;

  constructor(
    private readonly dtFixed: number,
    private readonly maxSubsteps: number,
  ) {}

  /**
   * Drains the accumulator. Calls `advance` exactly once per fixed substep.
   * Returns the number of substeps actually executed.
   */
  pump(dtReal: number, advance: () => void): number {
    if (dtReal < 0 || !Number.isFinite(dtReal)) return 0;
    this.accumulator += dtReal;
    let substeps = 0;
    while (this.accumulator >= this.dtFixed && substeps < this.maxSubsteps) {
      advance();
      this.accumulator -= this.dtFixed;
      substeps += 1;
    }
    if (substeps === this.maxSubsteps && this.accumulator >= this.dtFixed) {
      this.accumulator = 0;
    }
    return substeps;
  }

  /**
   * Force exactly one substep regardless of accumulator state.
   * Used by `world.stepOnce()` for deterministic single-stepping.
   */
  advanceOnce(advance: () => void): void {
    advance();
  }

  reset(): void {
    this.accumulator = 0;
  }

  get accumulated(): number {
    return this.accumulator;
  }
}
