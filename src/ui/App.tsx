import { useEffect, useRef } from "react";
import { ball, box, defaultSceneName } from "../simulation";
import { Renderer } from "../render";
import { Toolbar } from "./panels/Toolbar";
import { Inspector } from "./panels/Inspector";
import { PlaybackBar } from "./panels/PlaybackBar";
import { useSimulation } from "./hooks/useSimulation";
import { useUIStore } from "./state/store";
import { testIds } from "./a11y/ids";

export function App() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const sim = useSimulation(defaultSceneName);

  const showGrid = useUIStore((s) => s.showGrid);
  const showEField = useUIStore((s) => s.showEField);
  const hasCharges = useUIStore((s) => s.hasCharges);
  const setHasCharges = useUIStore((s) => s.setHasCharges);
  const setRunning = useUIStore((s) => s.setRunning);

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
      renderer.render(snap);
      setHasCharges(snap.charges.length > 0);
      raf = requestAnimationFrame(loop);
    };

    renderer.attach(host).then(() => {
      if (cancelled) return;
      renderer.setShowGrid(useUIStore.getState().showGrid);
      last = performance.now();
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [sim.world]);

  useEffect(() => {
    rendererRef.current?.setShowGrid(showGrid);
  }, [showGrid]);

  useEffect(() => {
    rendererRef.current?.setShowEField(showEField && hasCharges);
  }, [showEField, hasCharges]);

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
    sim.loadScene(defaultSceneName);
    setRunning(true);
  };

  const draggingRef = useRef(false);

  const worldFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const renderer = rendererRef.current;
    if (!renderer || !renderer.isReady) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    return renderer.camera.screenToWorld(
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
  };

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const world = worldFromEvent(e);
    if (!world) return;
    const tool = useUIStore.getState().tool;
    const setSelectedId = useUIStore.getState().setSelectedId;
    if (tool === "ball") {
      sim.add(ball({ position: world, radius: 0.4, material: "wood" }));
      return;
    }
    if (tool === "ball+") {
      sim.add(
        ball({ position: world, radius: 0.32, material: "metal", charge: 4 }),
      );
      return;
    }
    if (tool === "ball-") {
      sim.add(
        ball({ position: world, radius: 0.32, material: "metal", charge: -4 }),
      );
      return;
    }
    if (tool === "box") {
      sim.add(
        box({ position: world, width: 0.7, height: 0.7, material: "wood" }),
      );
      return;
    }
    const id = sim.world.startDragAt(world);
    if (id !== null) {
      draggingRef.current = true;
      setSelectedId(id);
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      setSelectedId(null);
    }
  };

  const onCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const world = worldFromEvent(e);
    if (!world) return;
    sim.world.updateDrag(world);
  };

  const endCanvasDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    sim.world.endDrag();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div data-testid={testIds.app} style={appShell}>
      <div style={mainRow}>
        <Toolbar />
        <main style={canvasArea}>
          <div
            ref={hostRef}
            data-testid={testIds.canvasHost}
            aria-label="Physics Box simulation canvas"
            onPointerDown={onCanvasPointerDown}
            onPointerMove={onCanvasPointerMove}
            onPointerUp={endCanvasDrag}
            onPointerCancel={endCanvasDrag}
            style={{ position: "absolute", inset: 0 }}
          />
        </main>
        <Inspector />
      </div>
      <PlaybackBar
        tick={sim.tick}
        onPlay={onPlay}
        onPause={onPause}
        onStep={onStep}
        onReset={onReset}
      />
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
};

const mainRow: React.CSSProperties = {
  flex: 1,
  display: "flex",
  minHeight: 0,
};

const canvasArea: React.CSSProperties = {
  flex: 1,
  position: "relative",
  background: "#f5efe6",
  overflow: "hidden",
};
