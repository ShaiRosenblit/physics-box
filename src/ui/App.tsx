import { useEffect, useRef, useState } from "react";
import {
  ball,
  balloon,
  bodyAnchor,
  box,
  defaultSceneName,
  engine,
  hinge,
  magnet,
  playbackTimeScale,
  playbackTimeScaleMax,
  playbackTimeScaleMin,
  type SceneName,
  pulley,
  rope,
  spring,
  worldAnchor,
  type Anchor,
  type BodyView,
  type Snapshot,
  type Vec2,
  type World,
} from "../simulation";
import { Renderer } from "../render";
import type { ConnectorPreviewState } from "../render/scene/ConnectorPreviewView";
import { Toolbar } from "./panels/Toolbar";
import { SpawnToolOptions } from "./panels/SpawnToolOptions";
import { ConnectorToolOptions } from "./panels/ConnectorToolOptions";
import { Inspector } from "./panels/Inspector";
import { InspectorPeek } from "./panels/InspectorPeek";
import { PlaybackBar } from "./panels/PlaybackBar";
import { Drawer } from "./components/Drawer";
import {
  CloseIcon,
  FitViewIcon,
  InspectorIcon,
  ToolsIcon,
} from "./icons";
import { useSimulation } from "./hooks/useSimulation";
import { SimulationProvider } from "./hooks/SimulationContext";
import {
  usePointerGestures,
  type ConnectorPending,
  type ResolvedAnchor,
  type SpawnMode,
} from "./canvas/usePointerGestures";
import { useViewportMode } from "./hooks/useViewportMode";
import { useUIStore } from "./state/store";
import { testIds } from "./a11y/ids";

export function App() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const sim = useSimulation(defaultSceneName);
  const mode = useViewportMode();

  // Pending connector state lives in refs so the per-frame loop can read
  // it without retriggering React. UI never mutates physics state from
  // here — the commit handler issues `world.addConstraint` once.
  const pendingConnectorRef = useRef<ConnectorPending | null>(null);
  const previewWorldPointRef = useRef<Vec2 | null>(null);

  const showGrid = useUIStore((s) => s.showGrid);
  const showEField = useUIStore((s) => s.showEField);
  const showBField = useUIStore((s) => s.showBField);
  const hasCharges = useUIStore((s) => s.hasCharges);
  const hasMagnets = useUIStore((s) => s.hasMagnets);
  const setHasCharges = useUIStore((s) => s.setHasCharges);
  const setHasMagnets = useUIStore((s) => s.setHasMagnets);
  const setRunning = useUIStore((s) => s.setRunning);
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const toolsOpen = useUIStore((s) => s.toolsOpen);
  const inspectorOpen = useUIStore((s) => s.inspectorOpen);
  const setToolsOpen = useUIStore((s) => s.setToolsOpen);
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const setDragging = useUIStore((s) => s.setDragging);
  const scene = useUIStore((s) => s.scene);
  const setScene = useUIStore((s) => s.setScene);
  const [airDensity, setAirDensity] = useState(() => sim.world.config.fluidDensity);
  const [timeScale, setTimeScaleState] = useState(playbackTimeScale);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new Renderer();
    rendererRef.current = renderer;

    let raf = 0;
    let cancelled = false;
    let last = performance.now();

    const loop = (now: number) => {
      if (cancelled) return;
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      sim.world.step(dt);
      const snap = sim.world.snapshot();
      renderer.setConnectorPreview(
        computePreviewState(
          snap,
          pendingConnectorRef.current,
          previewWorldPointRef.current,
          sim.world,
        ),
      );
      renderer.render(snap);
      setHasCharges(snap.charges.length > 0);
      setHasMagnets(snap.magnets.length > 0);
      raf = requestAnimationFrame(loop);
    };

    renderer.attach(host).then(() => {
      if (cancelled) return;
      renderer.setShowGrid(useUIStore.getState().showGrid);
      // Fit camera when bodies exist (empty scenes keep the default framing).
      renderer.fitToContent(sim.world.snapshot());
      last = performance.now();
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [sim.world, setHasCharges, setHasMagnets]);

  useEffect(() => {
    rendererRef.current?.setShowGrid(showGrid);
  }, [showGrid]);

  useEffect(() => {
    rendererRef.current?.setShowEField(showEField && hasCharges);
  }, [showEField, hasCharges]);

  useEffect(() => {
    rendererRef.current?.setShowBField(showBField && hasMagnets);
  }, [showBField, hasMagnets]);

  // Drive the on-canvas selection ring directly from the UI store; this
  // is intentionally independent of any drawer/peek state so users
  // always see what's selected.
  useEffect(() => {
    rendererRef.current?.setSelectedId(selectedId);
  }, [selectedId]);

  // Dev-only probe: exposes a tiny imperative surface to Playwright and
  // ad-hoc debugging. Disabled in production builds so it never leaks
  // simulation internals into the public bundle.
  useEffect(() => {
    if (import.meta.env.MODE === "production") return;
    const probe = {
      setSelectedId: (id: number | null) =>
        setSelectedId(id === null ? null : (id as unknown as NonNullable<typeof selectedId>)),
      setDragging,
      fitView: () => rendererRef.current?.fitToContent(sim.world.snapshot()),
      getCameraState: () => {
        const cam = rendererRef.current?.camera;
        return cam ? { center: cam.center, zoom: cam.zoom, canvas: cam.canvasSize } : null;
      },
      getBodies: () => sim.world.snapshot().bodies.map((b) => ({
        id: b.id,
        kind: b.kind,
        position: b.position,
      })),
    };
    (globalThis as unknown as { __pb?: unknown }).__pb = probe;
    return () => {
      const g = globalThis as unknown as { __pb?: unknown };
      if (g.__pb === probe) delete g.__pb;
    };
  }, [setSelectedId, setDragging, sim.world]);

  /** Delete / Backspace removes the selection when focus is outside form controls. */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (useUIStore.getState().dragging) return;
      const t = e.target;
      if (
        t instanceof Element &&
        t.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }
      const id = useUIStore.getState().selectedId;
      if (id === null) return;
      e.preventDefault();
      sim.remove(id);
      setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sim, setSelectedId]);

  const onPlay = () => {
    sim.resume();
    setRunning(true);
  };
  const onPause = () => {
    sim.pause();
    setRunning(false);
  };
  const onStep = () => {
    sim.stepOnce();
  };
  const onReset = () => {
    rendererRef.current?.reset();
    sim.loadScene(useUIStore.getState().scene);
    setSelectedId(null);
    setRunning(true);
    setAirDensity(sim.world.config.fluidDensity);
    rendererRef.current?.fitToContent(sim.world.snapshot());
  };

  const onSceneChange = (name: SceneName) => {
    setScene(name);
    rendererRef.current?.reset();
    sim.loadScene(name);
    setSelectedId(null);
    setAirDensity(sim.world.config.fluidDensity);
    rendererRef.current?.fitToContent(sim.world.snapshot());
  };

  const onFitView = () => {
    rendererRef.current?.fitToContent(sim.world.snapshot());
  };

  const handleSpawn = (kind: SpawnMode, world: Vec2) => {
    const presets = useUIStore.getState().spawnPresets;
    if (kind === "ball") {
      const p = presets.ball;
      sim.add(
        ball({
          position: world,
          radius: p.radius,
          material: p.material,
          linearDamping: p.linearDamping,
          angularDamping: p.angularDamping,
          ...(p.collideDynamicBalls ? {} : { collideWithBalls: false as const }),
        }),
      );
    } else if (kind === "ball+") {
      const p = presets.ballPlus;
      sim.add(
        ball({
          position: world,
          radius: p.radius,
          material: p.material,
          linearDamping: p.linearDamping,
          angularDamping: p.angularDamping,
          charge: p.charge,
          ...(p.collideDynamicBalls ? {} : { collideWithBalls: false as const }),
        }),
      );
    } else if (kind === "ball-") {
      const p = presets.ballMinus;
      sim.add(
        ball({
          position: world,
          radius: p.radius,
          material: p.material,
          linearDamping: p.linearDamping,
          angularDamping: p.angularDamping,
          charge: p.charge,
          ...(p.collideDynamicBalls ? {} : { collideWithBalls: false as const }),
        }),
      );
    } else if (kind === "balloon") {
      const p = presets.balloon;
      sim.add(
        balloon({
          position: world,
          radius: p.radius,
          material: p.material,
          linearDamping: p.linearDamping,
          angularDamping: p.angularDamping,
          buoyancyLift: p.buoyancyLift,
          ...(p.collideDynamicBalls ? {} : { collideWithBalls: false as const }),
        }),
      );
    } else if (kind === "magnet+" || kind === "magnet-") {
      const p = kind === "magnet+" ? presets.magnetPlus : presets.magnetMinus;
      const sign = kind === "magnet+" ? 1 : -1;
      sim.add(
        magnet({
          position: world,
          radius: p.radius,
          dipole: sign * p.dipoleMagnitude,
        }),
      );
    } else if (kind === "engine+" || kind === "engine-") {
      const p = kind === "engine+" ? presets.enginePlus : presets.engineMinus;
      const sign = kind === "engine+" ? 1 : -1;
      sim.add(
        engine({
          position: world,
          width: p.width,
          height: p.height,
          rotorRadius: p.flywheelRadius,
          torque: sign * p.torqueMagnitude,
          material: p.material,
          linearDamping: p.linearDamping,
          angularDamping: p.angularDamping,
        }),
      );
    } else if (kind === "box") {
      const p = presets.box;
      sim.add(
        box({
          position: world,
          width: p.width,
          height: p.height,
          material: p.material,
          linearDamping: p.linearDamping,
          angularDamping: p.angularDamping,
        }),
      );
    }
  };

  const handleConnectorCommit = (
    tool: "rope" | "hinge" | "spring",
    a: ResolvedAnchor,
    b: ResolvedAnchor,
  ) => {
    const presets = useUIStore.getState().connectorPresets;
    if (tool === "rope") {
      const pr = presets.rope;
      const length = anchorDistance(sim.world.snapshot(), a, b);
      if (length < 0.05) return;
      sim.world.addConstraint(
        rope({
          a: toAnchor(a),
          b: toAnchor(b),
          length,
          material: pr.material,
          segments: pr.segments,
        }),
      );
      return;
    }
    if (tool === "spring") {
      const ps = presets.spring;
      const restLength = anchorDistance(sim.world.snapshot(), a, b);
      if (restLength < 0.05) return;
      sim.world.addConstraint(
        spring({
          a: toAnchor(a),
          b: toAnchor(b),
          restLength,
          frequencyHz: ps.frequencyHz,
          dampingRatio: ps.dampingRatio,
        }),
      );
      return;
    }
    if (tool === "hinge") {
      // Anchor A is enforced by the gesture to be a body. The hinge
      // pivot is placed at click 2 in world space; if click 2 also
      // hits a body, the hinge becomes a body-to-body revolute.
      if (a.kind !== "body") return;
      sim.world.addConstraint(
        hinge({
          bodyA: a.id,
          bodyB: b.kind === "body" ? b.id : undefined,
          worldAnchor: b.kind === "body" ? b.hitPoint : b.point,
        }),
      );
    }
  };

  const handlePulleyCommit = (
    center: Vec2,
    bodyA: ResolvedAnchor,
    bodyB: ResolvedAnchor,
  ) => {
    if (bodyA.kind !== "body" || bodyB.kind !== "body") return;
    if (bodyA.id === bodyB.id) return;
    const snap = sim.world.snapshot();
    const ba = snap.bodies.find((b) => b.id === bodyA.id);
    const bb = snap.bodies.find((b) => b.id === bodyB.id);
    if (!ba || !bb || ba.fixed || bb.fixed) return;
    const pp = useUIStore.getState().connectorPresets.pulley;
    sim.world.addConstraint(
      pulley({
        wheelCenter: center,
        bodyA: bodyA.id,
        bodyB: bodyB.id,
        localAnchorA: hitWorldToBodyLocal(ba, bodyA.hitPoint),
        localAnchorB: hitWorldToBodyLocal(bb, bodyB.hitPoint),
        halfSpread: pp.halfSpread,
        ratio: pp.ratio,
      }),
    );
  };

  const handleConnectorPendingChange = (pending: ConnectorPending | null) => {
    pendingConnectorRef.current = pending;
    if (pending === null) previewWorldPointRef.current = null;
  };

  const handleConnectorPreviewMove = (worldPt: Vec2) => {
    previewWorldPointRef.current = worldPt;
  };

  usePointerGestures(hostRef, {
    world: sim.world,
    getCamera: () => rendererRef.current?.camera ?? null,
    getTool: () => useUIStore.getState().tool,
    onSpawn: handleSpawn,
    onSelect: setSelectedId,
    onDragStateChange: setDragging,
    onConnectorCommit: handleConnectorCommit,
    onPulleyCommit: handlePulleyCommit,
    onConnectorPendingChange: handleConnectorPendingChange,
    onConnectorPreviewMove: handleConnectorPreviewMove,
  });

  const isPhone = mode === "phone";
  const isTablet = mode === "tablet";
  const isDesktop = mode === "desktop";

  // Tablet shares the phone-style inspector UX (floating peek, drawer
  // accessed via a FAB). Only desktop keeps a permanent inspector
  // panel — at iPad-landscape widths the panel was just stealing
  // canvas width to render "No body selected".
  const inspectorAsDrawer = !isDesktop;

  return (
    <SimulationProvider value={sim}>
      <div data-testid={testIds.app} style={appShell}>
        <div style={mainRow}>
          {/* Toolbar: rail on tablet, full panel on desktop, drawer on phone. */}
          {isTablet && <Toolbar variant="rail" />}
          {isDesktop && <Toolbar variant="panel" />}

          <main style={canvasColumn}>
            <SpawnToolOptions />
            <ConnectorToolOptions />
            <div style={canvasStage}>
            <div
              ref={hostRef}
              data-testid={testIds.canvasHost}
              aria-label="Physics Box simulation canvas"
              style={canvasHostStyle}
            />

            <button
              type="button"
              aria-label="Fit scene to view"
              title="Fit view"
              data-testid={testIds.buttonFitView}
              onClick={onFitView}
              style={{
                ...fitButtonStyle,
                width: isPhone ? 44 : 36,
                height: isPhone ? 44 : 36,
                borderRadius: isPhone ? 22 : 18,
              }}
            >
              <FitViewIcon />
            </button>

            {isPhone && (
              <button
                type="button"
                aria-label="Open tools"
                data-testid={testIds.fabTools}
                onClick={() => setToolsOpen(true)}
                style={{ ...fabStyle, left: 12 }}
              >
                <ToolsIcon />
              </button>
            )}

            {inspectorAsDrawer && (
              <button
                type="button"
                aria-label="Open inspector"
                data-testid={testIds.fabInspector}
                onClick={() => setInspectorOpen(true)}
                style={{ ...fabStyle, right: 12 }}
              >
                <InspectorIcon />
              </button>
            )}

            {isPhone && (
              <Drawer
                open={toolsOpen}
                side="left"
                onDismiss={() => setToolsOpen(false)}
                ariaLabel="Tools panel"
                testId={testIds.drawerTools}
                size={Math.min(320, Math.round(typeof window !== "undefined" ? window.innerWidth * 0.78 : 280))}
              >
                <DrawerHeader title="Tools" onClose={() => setToolsOpen(false)} />
                <Toolbar variant="sheet" />
              </Drawer>
            )}
            {inspectorAsDrawer && (
              <Drawer
                open={inspectorOpen}
                side="bottom"
                onDismiss={() => setInspectorOpen(false)}
                ariaLabel="Inspector panel"
                testId={testIds.drawerInspector}
                size={420}
              >
                <DrawerHeader
                  title="Inspector"
                  onClose={() => setInspectorOpen(false)}
                />
                <Inspector variant="sheet" />
              </Drawer>
            )}
            </div>
          </main>

          {isDesktop && <Inspector variant="panel" />}
        </div>
        {inspectorAsDrawer && <InspectorPeek />}
        <PlaybackBar
          tick={sim.tick}
          compact={isPhone}
          scene={scene}
          gravityEnabled={sim.gravityEnabled}
          airDensity={airDensity}
          maxAirDensity={sim.world.config.maxFluidDensity}
          timeScale={timeScale}
          timeScaleMin={playbackTimeScaleMin}
          timeScaleMax={playbackTimeScaleMax}
          onSceneChange={onSceneChange}
          onGravityChange={sim.setGravityEnabled}
          onAirDensityChange={(v) => {
            sim.world.setFluidDensity(v);
            setAirDensity(v);
          }}
          onTimeScaleChange={(v) => {
            sim.setTimeScale(v);
            setTimeScaleState(sim.world.config.timeScale);
          }}
          onPlay={onPlay}
          onPause={onPause}
          onStep={onStep}
          onReset={onReset}
        />
      </div>
    </SimulationProvider>
  );
}

function toAnchor(a: ResolvedAnchor): Anchor {
  if (a.kind === "body") return bodyAnchor(a.id);
  return worldAnchor(a.point);
}

function hitWorldToBodyLocal(body: BodyView, hitWorld: Vec2): Vec2 {
  const dx = hitWorld.x - body.position.x;
  const dy = hitWorld.y - body.position.y;
  const c = Math.cos(body.angle);
  const s = Math.sin(body.angle);
  return {
    x: dx * c + dy * s,
    y: -dx * s + dy * c,
  };
}

function resolveAnchorPosition(
  snap: Snapshot,
  a: ResolvedAnchor,
): Vec2 | null {
  if (a.kind === "world") return a.point;
  const body = snap.bodies.find((b) => b.id === a.id);
  if (!body) return null;
  return body.position;
}

function anchorDistance(
  snap: Snapshot,
  a: ResolvedAnchor,
  b: ResolvedAnchor,
): number {
  const pa = resolveAnchorPosition(snap, a);
  const pb = resolveAnchorPosition(snap, b);
  if (!pa || !pb) return 0;
  return Math.hypot(pb.x - pa.x, pb.y - pa.y);
}

function computePreviewState(
  snap: Snapshot,
  pending: ConnectorPending | null,
  cursor: Vec2 | null,
  world: World,
): ConnectorPreviewState | null {
  if (!pending) return null;

  if (pending.tool === "pulley") {
    const snapping = cursor !== null && world.bodyAt(cursor) !== null;
    if (pending.stage === "center") {
      const c = pending.center;
      const cur = cursor ?? c;
      return {
        kind: "pulley-center",
        center: c,
        cursor: cur,
        snapping,
      };
    }
    const pa = resolveAnchorPosition(snap, pending.bodyA);
    if (!pa) return null;
    const cur = cursor ?? pa;
    return {
      kind: "pulley-body-a",
      center: pending.center,
      anchorA: pa,
      cursor: cur,
      snapping,
    };
  }

  const pa = resolveAnchorPosition(snap, pending.a);
  if (!pa) return null;
  const pb = cursor ?? pa;
  return { kind: pending.tool, a: pa, b: pb };
}

function DrawerHeader(props: { title: string; onClose: () => void }) {
  return (
    <div style={drawerHeaderStyle}>
      <span style={drawerTitleStyle}>{props.title}</span>
      <button
        type="button"
        aria-label="Close"
        onClick={props.onClose}
        style={drawerCloseStyle}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

const appShell: React.CSSProperties = {
  height: "100%",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  background: "#f5efe6",
  color: "#2a2520",
  paddingTop: "env(safe-area-inset-top)",
};

const mainRow: React.CSSProperties = {
  flex: 1,
  display: "flex",
  minHeight: 0,
  minWidth: 0,
};

const canvasColumn: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  position: "relative",
  background: "#f5efe6",
  minWidth: 0,
  minHeight: 0,
};

const canvasStage: React.CSSProperties = {
  flex: 1,
  position: "relative",
  overflow: "hidden",
  minHeight: 0,
};

const canvasHostStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
};

const fabStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(12px + env(safe-area-inset-top))",
  width: 44,
  height: 44,
  borderRadius: 22,
  border: "1px solid #d8cfbe",
  background: "#f5efe6",
  color: "#2a2520",
  boxShadow: "0 2px 12px rgba(42,37,32,0.18)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  zIndex: 15,
};

const fitButtonStyle: React.CSSProperties = {
  position: "absolute",
  right: 12,
  bottom: 12,
  border: "1px solid #d8cfbe",
  background: "#f5efe6",
  color: "#2a2520",
  boxShadow: "0 2px 10px rgba(42,37,32,0.14)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  zIndex: 14,
};

const drawerHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  borderBottom: "1px solid #d8cfbe",
};

const drawerTitleStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#5a4f43",
  fontWeight: 600,
};

const drawerCloseStyle: React.CSSProperties = {
  appearance: "none",
  border: "none",
  background: "transparent",
  color: "#5a4f43",
  cursor: "pointer",
  width: 32,
  height: 32,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 16,
};
