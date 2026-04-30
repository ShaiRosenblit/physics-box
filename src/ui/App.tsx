import { useEffect, useRef, useState } from "react";
import { World, defaultSceneName, scenes } from "../simulation";
import { Renderer } from "../render";
import { Toolbar } from "./panels/Toolbar";
import { Inspector } from "./panels/Inspector";
import { PlaybackBar } from "./panels/PlaybackBar";
import { useUIStore } from "./state/store";
import { testIds } from "./a11y/ids";

export function App() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<World | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [tick, setTick] = useState(0);

  const showGrid = useUIStore((s) => s.showGrid);
  const setRunning = useUIStore((s) => s.setRunning);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const world = new World();
    scenes[defaultSceneName](world);
    worldRef.current = world;

    const renderer = new Renderer();
    rendererRef.current = renderer;

    let raf = 0;
    let cancelled = false;
    let last = performance.now();

    const loop = (now: number) => {
      if (cancelled) return;
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      world.step(dt);
      renderer.render(world.snapshot());
      setTick(world.tick);
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
      worldRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setShowGrid(showGrid);
  }, [showGrid]);

  const onPlay = () => {
    worldRef.current?.resume();
    setRunning(true);
  };
  const onPause = () => {
    worldRef.current?.pause();
    setRunning(false);
  };
  const onStep = () => {
    worldRef.current?.stepOnce();
    setTick(worldRef.current?.tick ?? 0);
  };
  const onReset = () => {
    // M3 step 2 wires Reset to scene reload via useSimulation.
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
            style={{ position: "absolute", inset: 0 }}
          />
        </main>
        <Inspector />
      </div>
      <PlaybackBar
        tick={tick}
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
