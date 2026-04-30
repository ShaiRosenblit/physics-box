import { useEffect, useMemo, useState } from "react";
import { World } from "../simulation";
import { Renderer } from "../render";

export function App() {
  const world = useMemo(() => new World(), []);
  const renderer = useMemo(() => new Renderer(), []);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const snap = world.snapshot();
    renderer.render(snap);
    setTick(snap.tick);
  }, [renderer, world]);

  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        color: "#5a4f43",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        fontSize: "0.85rem",
      }}
    >
      <div>
        <div>Physics Box — scaffold</div>
        <div
          aria-live="polite"
          style={{ marginTop: 8, fontSize: "0.75rem", opacity: 0.7 }}
        >
          tick {tick}
        </div>
      </div>
    </div>
  );
}
