import { Application, Container } from "pixi.js";
import { defaultConfig, type SimulationConfig, type Snapshot } from "../simulation";
import { Camera } from "./camera/Camera";
import { CameraController } from "./camera/CameraController";
import { BodyLayer } from "./scene/BodyView";
import { ConstraintLayer } from "./scene/ConstraintView";
import { FieldView } from "./scene/FieldView";
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
  private constraintLayer: ConstraintLayer;
  private fieldView: FieldView;
  private _camera = new Camera();
  private _controller = new CameraController();
  private resizeObserver: ResizeObserver | null = null;
  private _initPromise: Promise<void> | null = null;
  private _ready = false;
  private _disposed = false;
  private _lastGeomZoom = 0;
  private _geomDirty = false;
  private _lastFieldTick = -1;
  private _lastFieldZoom = 0;
  private _lastFieldCenterX = Number.NaN;
  private _lastFieldCenterY = Number.NaN;

  constructor(config: SimulationConfig = defaultConfig) {
    this.bodyLayer = new BodyLayer(() => this._camera.zoom);
    this.constraintLayer = new ConstraintLayer(() => this._camera.zoom);
    this.fieldView = new FieldView(config);
  }

  get controller(): CameraController {
    return this._controller;
  }

  setShowGrid(visible: boolean): void {
    this.grid.node.visible = visible;
  }

  setShowEField(visible: boolean): void {
    this.fieldView.setShowE(visible);
    this._lastFieldTick = -1;
  }

  /** Drop all body and constraint display objects. */
  reset(): void {
    this.bodyLayer.clear();
    this.constraintLayer.clear();
    this._lastFieldTick = -1;
  }

  get camera(): Camera {
    return this._camera;
  }

  get isReady(): boolean {
    return this._ready;
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
        if (this._disposed) {
          this.destroyApp(app);
          return;
        }
        host.appendChild(app.canvas);
        app.stage.addChild(this.worldRoot);
        this.worldRoot.addChild(this.grid.node);
        this.worldRoot.addChild(this.fieldView.container);
        this.worldRoot.addChild(this.constraintLayer.node);
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

        this._ready = true;
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
    this.constraintLayer.reconcile(snapshot);
    this.updateFieldView(snapshot);
    this.app.render();
  }

  private updateFieldView(snapshot: Snapshot): void {
    const center = this._camera.center;
    const zoom = this._camera.zoom;
    const tickChanged = snapshot.tick !== this._lastFieldTick;
    const cameraChanged =
      center.x !== this._lastFieldCenterX ||
      center.y !== this._lastFieldCenterY ||
      Math.abs(Math.log(zoom / Math.max(this._lastFieldZoom, 1e-9))) >= 0.05;
    if (!tickChanged && !cameraChanged) return;
    this._lastFieldTick = snapshot.tick;
    this._lastFieldZoom = zoom;
    this._lastFieldCenterX = center.x;
    this._lastFieldCenterY = center.y;
    this.fieldView.update(snapshot.charges, this._camera);
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._controller.detach();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.bodyLayer.clear();
    this.constraintLayer.clear();

    if (this._ready && this.app) {
      this.destroyApp(this.app);
    }
    this._initPromise = null;
  }

  private destroyApp(app: Application): void {
    try {
      app.destroy(true, { children: true });
    } catch {
      // Init may have been cancelled mid-flight; safe to ignore.
    }
    if (this.app === app) {
      this.app = null;
    }
    this._ready = false;
  }

  private handleResize(): void {
    if (!this.app) return;
    this._camera.setCanvas(this.app.renderer.width, this.app.renderer.height);
    this._camera.apply(this.worldRoot);
    this.grid.update(this._camera);
  }
}
