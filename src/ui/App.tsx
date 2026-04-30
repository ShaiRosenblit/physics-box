import { useEffect, useRef, useState } from "react";
import { World, ball, box } from "../simulation";
import { Renderer } from "../render";

export function App() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const world = new World();
    const renderer = new Renderer();

    world.add(
      box({
        position: { x: 0, y: -0.25 },
        width: 24,
        height: 0.5,
        fixed: true,
        material: "wood",
      }),
    );
    world.add(ball({ position: { x: -1.4, y: 4 }, radius: 0.4, material: "metal" }));
    world.add(ball({ position: { x: 0.5, y: 5.5 }, radius: 0.5, material: "wood" }));
    world.add(ball({ position: { x: 1.6, y: 6.2 }, radius: 0.3, material: "cork" }));
    world.add(box({ position: { x: -2.4, y: 6.0 }, width: 0.8, height: 0.8 }));

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
      last = performance.now();
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <div
        ref={hostRef}
        data-testid="canvas-host"
        aria-label="Physics Box simulation canvas"
        style={{ position: "absolute", inset: 0 }}
      />
      <div
        aria-live="polite"
        data-testid="tick-counter"
        style={{
          position: "absolute",
          top: 12,
          left: 16,
          fontSize: "0.75rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#5a4f43",
          opacity: 0.65,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        tick {tick}
      </div>
    </div>
  );
}
