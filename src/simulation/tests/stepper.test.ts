import { describe, expect, it } from "vitest";
import { Stepper } from "../core/Stepper";

describe("Stepper", () => {
  it("does not advance when accumulated time is below dt", () => {
    const dt = 1 / 120;
    const stepper = new Stepper(dt, 8);
    let count = 0;
    const substeps = stepper.pump(dt * 0.5, () => count++);
    expect(substeps).toBe(0);
    expect(count).toBe(0);
    expect(stepper.accumulated).toBeCloseTo(dt * 0.5, 12);
  });

  it("advances exactly N substeps for N*dt of real time", () => {
    const dt = 1 / 120;
    const stepper = new Stepper(dt, 16);
    let count = 0;
    const substeps = stepper.pump(dt * 7 + dt * 0.1, () => count++);
    expect(substeps).toBe(7);
    expect(count).toBe(7);
    expect(stepper.accumulated).toBeGreaterThan(0);
    expect(stepper.accumulated).toBeLessThan(dt);
  });

  it("preserves leftover accumulator across calls", () => {
    const dt = 1 / 120;
    const stepper = new Stepper(dt, 16);
    let count = 0;
    stepper.pump(dt * 0.7, () => count++);
    stepper.pump(dt * 0.7, () => count++);
    expect(count).toBe(1);
    expect(stepper.accumulated).toBeCloseTo(dt * 0.4, 10);
  });

  it("caps at maxSubsteps and discards leftover to avoid spiral-of-death", () => {
    const dt = 1 / 120;
    const max = 4;
    const stepper = new Stepper(dt, max);
    let count = 0;
    const substeps = stepper.pump(dt * 100, () => count++);
    expect(substeps).toBe(max);
    expect(count).toBe(max);
    expect(stepper.accumulated).toBe(0);
  });

  it("ignores negative or non-finite real time", () => {
    const stepper = new Stepper(1 / 120, 8);
    let count = 0;
    expect(stepper.pump(-1, () => count++)).toBe(0);
    expect(stepper.pump(Number.NaN, () => count++)).toBe(0);
    expect(stepper.pump(Number.POSITIVE_INFINITY, () => count++)).toBe(0);
    expect(count).toBe(0);
  });

  it("advanceOnce always invokes the advance callback exactly once", () => {
    const stepper = new Stepper(1 / 120, 8);
    let count = 0;
    stepper.advanceOnce(() => count++);
    stepper.advanceOnce(() => count++);
    expect(count).toBe(2);
  });
});
