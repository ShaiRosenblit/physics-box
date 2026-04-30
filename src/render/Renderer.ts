import type { Snapshot } from "../simulation";

/**
 * The Pixi-backed renderer.
 *
 * M0 stub: structure is in place, behavior arrives in M2.
 * The renderer consumes immutable Snapshot objects and never reaches
 * back into the simulation kernel.
 */
export class Renderer {
  private _attached = false;

  attach(_canvas: HTMLCanvasElement): void {
    this._attached = true;
  }

  render(_snapshot: Snapshot): void {
    // M2 will draw grid, bodies, and (later) field lines.
  }

  dispose(): void {
    this._attached = false;
  }

  get attached(): boolean {
    return this._attached;
  }
}
