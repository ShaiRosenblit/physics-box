import { Application, Container } from "pixi.js";
import type { Snapshot } from "../simulation";
import { Camera } from "./camera/Camera";
import { CameraController } from "./camera/CameraController";
import { BodyLayer } from "./scene/BodyView";
import { Grid } from "./scene/Grid";
import { palette } from "./style/palette";

const GEOM_REFRESH_LOG_THRESHOLD = 0.4;

export interface RendererOptions {
  readonly background?: number;
  readonly antialias?: boolean;
  readonly resolution?: number;
}

/**
 * The Pixi-backed renderer.
 *
 * Consumes immutable Snapshot objects and never reaches back into the
 * simulation kernel. Layers, back to front:
 *   - background (clear color)
 *   - grid
 *   - body layer
 *   - (M6+) field layer, selection layer
 */
export class Renderer {
  private app: Application | null = null;
  private worldRoot = new Container();
  private grid = new Grid();
  private bodyLayer: BodyLayer;
  private _camera = new Camera();
  private _controller = new CameraController();
  private resizeObserver: ResizeObserver | null = null;
  private _initPromise: Promise<void> | null = null;
  private _lastGeomZoom = 0;
  private _geomDirty = false;

  constructor() {
    this.bodyLayer = new BodyLayer(() => this._camera.zoom);
  }

  get controller(): CameraController {
    return this._controller;
  }

  get camera(): Camera {
    return this._camera;
  }

  get isReady(): boolean {
    return this.app !== null;
  }

  /**
   * Mount the Pixi application into a host element. The host element
   * sizes the canvas; the renderer listens for resize and updates the
   * camera/grid accordingly. Returns when Pixi has finished initializing.
   */
  attach(host: HTMLElement, options: RendererOptions = {}): Promise<void> {
    if (this._initPromise) return this._initPromise;
    const app = new Application();
    this.app = app;

    this._initPromise = app
      .init({
        background: options.background ?? palette.paper,
        antialias: options.antialias ?? true,
        resolution: options.resolution ?? window.devicePixelRatio,
        resizeTo: host,
        autoDensity: true,
        autoStart: false,
      })
      .then(() => {
        host.appendChild(app.canvas);
        app.stage.addChild(this.worldRoot);
        this.worldRoot.addChild(this.grid.node);
        this.worldRoot.addChild(this.bodyLayer.node);

        this._camera.setCanvas(app.renderer.width, app.renderer.height);
        this._camera.apply(this.worldRoot);
        this.grid.update(this._camera);
        this._lastGeomZoom = this._camera.zoom;

        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(host);

        this._controller.attach(host, this._camera, () => {
          this._geomDirty = true;
        });
      });

    return this._initPromise;
  }

  /** Reconcile the scene with a new snapshot and render one frame. */
  render(snapshot: Snapshot): void {
    if (!this.app) return;
    this._camera.apply(this.worldRoot);
    this.grid.update(this._camera);

    if (
      this._geomDirty &&
      Math.abs(Math.log(this._camera.zoom / this._lastGeomZoom)) >=
        GEOM_REFRESH_LOG_THRESHOLD
    ) {
      this.bodyLayer.refreshGeometry(snapshot);
      this._lastGeomZoom = this._camera.zoom;
      this._geomDirty = false;
    } else {
      this.bodyLayer.reconcile(snapshot);
    }
    this.app.render();
  }

  dispose(): void {
    this._controller.detach();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.bodyLayer.clear();
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = null;
    }
    this._initPromise = null;
  }

  private handleResize(): void {
    if (!this.app) return;
    this._camera.setCanvas(this.app.renderer.width, this.app.renderer.height);
    this._camera.apply(this.worldRoot);
    this.grid.update(this._camera);
  }
}
