import { Application, Container, Graphics } from "pixi.js";
import {
  defaultConfig,
  type Id,
  type SimulationConfig,
  type Snapshot,
} from "../simulation";
import { Camera } from "./camera/Camera";
import { BodyLayer, SelectionView } from "./scene/BodyView";
import { loadRenderTextures } from "./loadRenderTextures";
import {
  ConnectorPreviewView,
  type ConnectorPreviewState,
} from "./scene/ConnectorPreviewView";
import { ConstraintLayer } from "./scene/ConstraintView";
import { FieldView } from "./scene/FieldView";
import { GoalZoneView } from "./scene/GoalZoneView";
import { Grid } from "./scene/Grid";
import { cartoonPalette, palette, type RenderTheme } from "./style/palette";
import type { GameMode, GoalZone } from "../game/types";

const GEOM_REFRESH_LOG_THRESHOLD = 0.4;

/** Inclusive world-space rectangle the camera should always frame. */
export interface ViewBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface RendererOptions {
  readonly background?: number;
  readonly antialias?: boolean;
  readonly resolution?: number;
}

const VIEW_BOUNDS_FIT = {
  paddingFraction: 0,
  minZoom: 0.5,
  maxZoom: 4000,
} as const;

/**
 * The Pixi-backed renderer.
 *
 * Consumes immutable Snapshot objects and never reaches back into the
 * simulation kernel. Layers, back to front:
 *   - clear canvas (`palette.paper`)
 *   - adaptive grid (optional)
 *   - electric / magnetic fields
 *   - connectors behind bodies (ropes, springs)
 *   - bodies (procedural + optional raster wood)
 *   - hinge pivot markers (on top of hulls)
 *   - selection ring, connector preview
 */
export class Renderer {
  private app: Application | null = null;
  private worldRoot = new Container();
  private letterbox = new Graphics();
  private grid = new Grid();
  private goalZoneView = new GoalZoneView();
  private bodyLayer: BodyLayer;
  private constraintLayer: ConstraintLayer;
  private fieldView: FieldView;
  private selectionView: SelectionView;
  private connectorPreview: ConnectorPreviewView;
  private _camera = new Camera();
  private _lastSnapshot: Snapshot | null = null;
  private _pendingFit:
    | { kind: "content"; paddingFraction: number }
    | { kind: "bounds"; bounds: ViewBounds }
    | null = null;
  private _viewBounds: ViewBounds | null = null;
  private _lastContentFit: {
    bounds: ViewBounds;
    paddingFraction: number;
  } | null = null;
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
  private _lastFieldTimestamp = 0;
  private _theme: RenderTheme = "workshop";

  constructor(config: SimulationConfig = defaultConfig) {
    this.bodyLayer = new BodyLayer(
      () => this._camera.zoom,
      () => this._theme,
    );
    this.constraintLayer = new ConstraintLayer(() => this._camera.zoom);
    this.fieldView = new FieldView(config);
    this.selectionView = new SelectionView(() => this._camera.zoom);
    this.connectorPreview = new ConnectorPreviewView(() => this._camera.zoom);
  }

  /**
   * Switch the renderer between the muted workshop palette (sandbox) and
   * the saturated cartoon palette (puzzle). Forces all bodies to rebuild
   * with the new style and updates the canvas background.
   *
   * Safe to call before `attach()` resolves — the new theme is picked up
   * once init completes; the body layer reads the theme on each reconcile
   * via the getter passed in the constructor.
   */
  setMode(mode: GameMode): void {
    const next: RenderTheme = mode === "puzzle" ? "cartoon" : "workshop";
    if (next === this._theme) return;
    this._theme = next;
    const bg = next === "cartoon" ? cartoonPalette.paper : palette.paper;
    if (this._ready && this.app) {
      this.app.renderer.background.color = bg;
    }
    if (this._lastSnapshot) {
      this.bodyLayer.refreshGeometry(this._lastSnapshot);
    }
  }

  setConnectorPreview(state: ConnectorPreviewState | null): void {
    this.connectorPreview.set(state);
  }

  setGoalZones(zones: readonly GoalZone[]): void {
    this.goalZoneView.setZones(zones);
  }

  setSelectedId(id: Id | null): void {
    this.selectionView.setSelectedId(id);
    if (this._lastSnapshot) {
      this.selectionView.update(this._lastSnapshot);
    }
  }

  /**
   * Frame the snapshot's bodies inside the canvas with margin. When the
   * scene has declared explicit `viewBounds`, those win and content is
   * not re-framed (the viewport stays locked to the scene-declared rect).
   *
   * Safe to call before `attach()` resolves; the request is queued and
   * runs on the first render once the canvas is sized.
   */
  fitToContent(snapshot: Snapshot, paddingFraction = 0.12): void {
    if (this._viewBounds) {
      // Scene declared an explicit view rectangle — that's the framing,
      // regardless of body layout.
      return;
    }
    const bounds = computeBounds(snapshot);
    if (!bounds) return;
    this._lastContentFit = { bounds, paddingFraction };
    if (this._camera.canvasSize.width <= 0 || this._camera.canvasSize.height <= 0) {
      this._pendingFit = { kind: "content", paddingFraction };
      return;
    }
    this._camera.fit(bounds, { paddingFraction });
    this._geomDirty = true;
    this._lastFieldTick = -1;
    if (this.app) {
      this._camera.apply(this.worldRoot);
      this.grid.update(this._camera);
      this.updateLetterbox();
    }
  }

  /**
   * Lock the camera to the given world-space rectangle. While set, the
   * camera ignores `fitToContent` and re-fits to these bounds on resize
   * so the rectangle is always exactly framed. Pass `null` to clear and
   * fall back to fit-to-content.
   *
   * Content outside the rectangle is masked with the canvas background
   * so it never bleeds into the visible area on a non-matching aspect
   * ratio.
   */
  setViewBounds(bounds: ViewBounds | null): void {
    this._viewBounds = bounds ? { ...bounds } : null;
    this._lastFieldTick = -1;
    if (!bounds) {
      this.updateLetterbox();
      return;
    }
    if (this._camera.canvasSize.width <= 0 || this._camera.canvasSize.height <= 0) {
      this._pendingFit = { kind: "bounds", bounds: { ...bounds } };
      return;
    }
    this._camera.fit(bounds, VIEW_BOUNDS_FIT);
    this._geomDirty = true;
    if (this.app) {
      this._camera.apply(this.worldRoot);
      this.grid.update(this._camera);
      this.updateLetterbox();
    }
  }

  setShowGrid(visible: boolean): void {
    this.grid.node.visible = visible;
  }

  setShowEField(visible: boolean): void {
    this.fieldView.setShowE(visible);
    this._lastFieldTick = -1;
  }

  setShowBField(visible: boolean): void {
    this.fieldView.setShowB(visible);
    this._lastFieldTick = -1;
  }

  /** Drop all body and constraint display objects. */
  reset(): void {
    this.bodyLayer.clear();
    this.constraintLayer.clear();
    this.selectionView.clear();
    this.connectorPreview.clear();
    this._lastFieldTick = -1;
    this._lastSnapshot = null;
    this._lastContentFit = null;
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

    const initialBg =
      options.background ??
      (this._theme === "cartoon" ? cartoonPalette.paper : palette.paper);
    this._initPromise = app
      .init({
        background: initialBg,
        antialias: options.antialias ?? true,
        resolution: options.resolution ?? window.devicePixelRatio,
        resizeTo: host,
        autoDensity: true,
        autoStart: false,
      })
      .then(async () => {
        if (this._disposed) {
          this.destroyApp(app);
          return;
        }
        // Apply the current theme background in case setMode was called
        // before init completed.
        const themedBg =
          this._theme === "cartoon" ? cartoonPalette.paper : palette.paper;
        app.renderer.background.color = options.background ?? themedBg;
        host.appendChild(app.canvas);
        app.stage.addChild(this.worldRoot);

        const loaded = await loadRenderTextures();
        if (this._disposed) {
          this.destroyApp(app);
          return;
        }
        this.bodyLayer.setRasterTextures({
          woodBox: loaded.woodBox,
          woodBall: loaded.ballWood,
        });

        this.worldRoot.addChild(this.grid.node);
        this.worldRoot.addChild(this.goalZoneView.node);
        this.worldRoot.addChild(this.fieldView.container);
        this.worldRoot.addChild(this.constraintLayer.behindBodies);
        this.worldRoot.addChild(this.bodyLayer.node);
        this.worldRoot.addChild(this.constraintLayer.inFrontOfBodies);
        this.worldRoot.addChild(this.selectionView.node);
        this.worldRoot.addChild(this.connectorPreview.node);
        // Letterbox lives on the stage (screen space) so it covers any
        // pixels outside scene-declared view bounds with the paper color.
        app.stage.addChild(this.letterbox);

        this._camera.setCanvas(app.renderer.width, app.renderer.height);
        if (this._viewBounds) {
          this._camera.fit(this._viewBounds, VIEW_BOUNDS_FIT);
        }
        this._camera.apply(this.worldRoot);
        this.grid.update(this._camera);
        this.updateLetterbox();
        this._lastGeomZoom = this._camera.zoom;

        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(host);

        this._ready = true;
      });

    return this._initPromise;
  }

  /** Reconcile the scene with a new snapshot and render one frame. */
  render(snapshot: Snapshot): void {
    if (!this.app) return;
    this._lastSnapshot = snapshot;

    if (this._pendingFit && this._camera.canvasSize.width > 0) {
      if (this._pendingFit.kind === "bounds") {
        this._camera.fit(this._pendingFit.bounds, VIEW_BOUNDS_FIT);
        this._geomDirty = true;
        this._lastFieldTick = -1;
        this._pendingFit = null;
      } else if (!this._viewBounds) {
        const bounds = computeBounds(snapshot);
        if (bounds) {
          this._lastContentFit = {
            bounds,
            paddingFraction: this._pendingFit.paddingFraction,
          };
          this._camera.fit(bounds, {
            paddingFraction: this._pendingFit.paddingFraction,
          });
          this._geomDirty = true;
          this._lastFieldTick = -1;
          this._pendingFit = null;
        }
      } else {
        // viewBounds was set after a content-fit was queued; the bounds
        // win, drop the queued fit.
        this._pendingFit = null;
      }
    }

    this._camera.apply(this.worldRoot);
    this.grid.update(this._camera);
    this.goalZoneView.update(this._camera);
    this.updateLetterbox();

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
    this.selectionView.update(snapshot);
    this.updateFieldView(snapshot);
    this.connectorPreview.redraw();
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

    // Throttle to ~30 Hz max to keep streamline tracing off the hot path.
    const now = performance.now();
    if (tickChanged && !cameraChanged && now - this._lastFieldTimestamp < 33) {
      return;
    }
    this._lastFieldTimestamp = now;
    this._lastFieldTick = snapshot.tick;
    this._lastFieldZoom = zoom;
    this._lastFieldCenterX = center.x;
    this._lastFieldCenterY = center.y;
    this.fieldView.update(snapshot.charges, snapshot.magnets, this._camera);
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.bodyLayer.clear();
    this.constraintLayer.clear();
    this.connectorPreview.clear();
    this.letterbox.clear();

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
    // The viewport is locked, so on resize we re-frame whatever the
    // active fit policy is (explicit view bounds or last content fit).
    if (this._viewBounds) {
      this._camera.fit(this._viewBounds, VIEW_BOUNDS_FIT);
      this._geomDirty = true;
    } else if (this._lastContentFit) {
      this._camera.fit(this._lastContentFit.bounds, {
        paddingFraction: this._lastContentFit.paddingFraction,
      });
      this._geomDirty = true;
    }
    this._camera.apply(this.worldRoot);
    this.grid.update(this._camera);
    this.updateLetterbox();
  }

  /**
   * Paint paper-colored bands over any pixels outside the active view
   * rectangle so off-bounds content never bleeds through. With no
   * `viewBounds` set, the letterbox is empty.
   */
  private updateLetterbox(): void {
    const g = this.letterbox;
    g.clear();
    if (!this._viewBounds) return;
    const { width, height } = this._camera.canvasSize;
    if (width <= 0 || height <= 0) return;

    const tl = this._camera.worldToScreen(this._viewBounds.minX, this._viewBounds.maxY);
    const br = this._camera.worldToScreen(this._viewBounds.maxX, this._viewBounds.minY);
    const left = Math.max(0, Math.min(width, tl.x));
    const right = Math.max(0, Math.min(width, br.x));
    const top = Math.max(0, Math.min(height, tl.y));
    const bottom = Math.max(0, Math.min(height, br.y));

    const paint = (x: number, y: number, w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      g.rect(x, y, w, h).fill({ color: palette.paper });
    };
    paint(0, 0, width, top);
    paint(0, bottom, width, height - bottom);
    paint(0, top, left, bottom - top);
    paint(right, top, width - right, bottom - top);
  }
}

/**
 * Compute the AABB used for fit-to-scene framing.
 *
 * Filters out very-large fixed boxes (e.g. the workshop floor plate, walls,
 * and ceiling) so the framing reflects the interesting bodies, then adds a
 * small bottom margin so the implied ground line stays visible.
 */
function computeBounds(
  snapshot: Snapshot,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (snapshot.bodies.length === 0) return null;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let included = 0;

  for (const body of snapshot.bodies) {
    let halfX: number;
    let halfY: number;
    if (
      body.kind === "ball" ||
      body.kind === "balloon" ||
      body.kind === "magnet" ||
      body.kind === "electromagnet" ||
      body.kind === "engine_rotor" ||
      body.kind === "crank"
    ) {
      halfX = body.radius;
      halfY = body.radius;
    } else {
      const half = Math.hypot(body.width, body.height) / 2;
      // Skip oversized fixed boxes (ground / walls) — they would force
      // the camera to zoom out so far that everything else looks tiny.
      if (body.fixed && half > 4) continue;
      halfX = half;
      halfY = half;
    }
    minX = Math.min(minX, body.position.x - halfX);
    maxX = Math.max(maxX, body.position.x + halfX);
    minY = Math.min(minY, body.position.y - halfY);
    maxY = Math.max(maxY, body.position.y + halfY);
    included++;
  }

  if (included === 0) return null;

  // Reveal a sliver of "ground" so the scene is grounded visually.
  const groundReveal = 0.4;
  return { minX, minY: Math.min(minY, -groundReveal), maxX, maxY };
}
