import type { Camera } from "./Camera";

export interface CameraControllerOptions {
  readonly minZoom?: number;
  readonly maxZoom?: number;
  /**
   * Multiplier applied per unit of normalized wheel deltaY. Smaller =
   * gentler zoom. Default 0.0015.
   */
  readonly wheelSensitivity?: number;
}

/**
 * Wires DOM events to a Camera: wheel to zoom (anchored at the cursor),
 * middle-button or right-button drag to pan.
 *
 * Lives in render/ (not kernel/) — the kernel must not see the DOM.
 */
export class CameraController {
  private host: HTMLElement | null = null;
  private camera: Camera | null = null;
  private onChange: (() => void) | null = null;

  private readonly minZoom: number;
  private readonly maxZoom: number;
  private readonly sensitivity: number;

  private dragging = false;
  private dragButton = -1;
  private dragStartScreen = { x: 0, y: 0 };
  private dragStartCenter = { x: 0, y: 0 };

  constructor(options: CameraControllerOptions = {}) {
    this.minZoom = options.minZoom ?? 8;
    this.maxZoom = options.maxZoom ?? 240;
    this.sensitivity = options.wheelSensitivity ?? 0.0015;
  }

  attach(host: HTMLElement, camera: Camera, onChange: () => void): void {
    this.host = host;
    this.camera = camera;
    this.onChange = onChange;

    host.addEventListener("wheel", this.handleWheel, { passive: false });
    host.addEventListener("pointerdown", this.handlePointerDown);
    host.addEventListener("pointermove", this.handlePointerMove);
    host.addEventListener("pointerup", this.handlePointerUp);
    host.addEventListener("pointercancel", this.handlePointerUp);
    host.addEventListener("contextmenu", this.handleContextMenu);
  }

  detach(): void {
    const host = this.host;
    if (!host) return;
    host.removeEventListener("wheel", this.handleWheel);
    host.removeEventListener("pointerdown", this.handlePointerDown);
    host.removeEventListener("pointermove", this.handlePointerMove);
    host.removeEventListener("pointerup", this.handlePointerUp);
    host.removeEventListener("pointercancel", this.handlePointerUp);
    host.removeEventListener("contextmenu", this.handleContextMenu);
    this.host = null;
    this.camera = null;
    this.onChange = null;
    this.dragging = false;
  }

  private localXY(e: PointerEvent | WheelEvent): { x: number; y: number } {
    const rect = this.host!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private handleWheel = (e: WheelEvent): void => {
    if (!this.camera) return;
    e.preventDefault();
    const { x, y } = this.localXY(e);
    const before = this.camera.screenToWorld(x, y);
    const factor = Math.exp(-e.deltaY * this.sensitivity);
    const nextZoom = clamp(this.camera.zoom * factor, this.minZoom, this.maxZoom);
    this.camera.setZoom(nextZoom);

    const after = this.camera.screenToWorld(x, y);
    this.camera.setCenter({
      x: this.camera.center.x + (before.x - after.x),
      y: this.camera.center.y + (before.y - after.y),
    });
    this.onChange?.();
  };

  private handlePointerDown = (e: PointerEvent): void => {
    if (!this.camera) return;
    if (e.button !== 1 && e.button !== 2) return;
    this.dragging = true;
    this.dragButton = e.button;
    this.dragStartScreen = this.localXY(e);
    this.dragStartCenter = { ...this.camera.center };
    this.host?.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.camera || !this.dragging) return;
    const { x, y } = this.localXY(e);
    const dx = x - this.dragStartScreen.x;
    const dy = y - this.dragStartScreen.y;
    const z = this.camera.zoom;
    this.camera.setCenter({
      x: this.dragStartCenter.x - dx / z,
      y: this.dragStartCenter.y + dy / z,
    });
    this.onChange?.();
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (!this.dragging) return;
    if (e.button !== -1 && e.button !== this.dragButton) return;
    this.dragging = false;
    this.dragButton = -1;
    if (this.host?.hasPointerCapture(e.pointerId)) {
      this.host.releasePointerCapture(e.pointerId);
    }
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}
