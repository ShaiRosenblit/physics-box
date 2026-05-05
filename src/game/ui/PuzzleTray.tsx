import { useRef, useState } from "react";
import { useUIStore } from "../../ui/state/store";
import type { GameTool } from "../types";

const TOOL_LABEL: Readonly<Record<GameTool, string>> = {
  ball: "Ball",
  balloon: "Balloon",
  box: "Box",
  crank: "Crank",
  "ball+": "Ball (+)",
  "ball-": "Ball (−)",
  "magnet+": "Magnet N",
  "magnet-": "Magnet S",
  "engine+": "Engine CCW",
  "engine-": "Engine CW",
  rope: "Rope",
  hinge: "Hinge",
  spring: "Spring",
  pulley: "Pulley",
  belt: "Belt",
  bar: "Bar",
};

export interface PuzzleTrayProps {
  readonly onDrop: (tool: GameTool, clientX: number, clientY: number) => void;
  readonly getTrayBottom: () => number;
}

export function PuzzleTray(props: PuzzleTrayProps) {
  const inventory = useUIStore((s) => s.inventory);
  const phase = useUIStore((s) => s.phase);
  const [dragTool, setDragTool] = useState<GameTool | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [nearRemoval, setNearRemoval] = useState(false);
  const trayRef = useRef<HTMLDivElement>(null);

  const inventoryEntries = Object.entries(inventory).filter(
    ([, count]) => count > 0,
  ) as Array<[GameTool, number]>;

  const handleChipPointerDown = (tool: GameTool) => (e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    setDragTool(tool);
    setDragPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!dragTool || !dragPos) return;
    setDragPos({ x: e.clientX, y: e.clientY });

    // Detect if pointer is over tray area for removal indicator
    const trayBottom = props.getTrayBottom();
    setNearRemoval(e.clientY >= trayBottom);
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!dragTool || !dragPos) {
      setDragTool(null);
      setDragPos(null);
      setNearRemoval(false);
      return;
    }

    const trayBottom = props.getTrayBottom();
    if (e.clientY < trayBottom) {
      // Dropped on canvas area - spawn the item
      props.onDrop(dragTool, e.clientX, e.clientY);
    }
    // If dropped on tray area, just cancel (no spawn)

    setDragTool(null);
    setDragPos(null);
    setNearRemoval(false);
  };

  if (phase !== "design") return null;

  return (
    <>
      <div
        ref={trayRef}
        style={trayStyle}
        onPointerMove={(e) => handlePointerMove(e as any)}
        onPointerUp={(e) => handlePointerUp(e as any)}
        onPointerCancel={() => {
          setDragTool(null);
          setDragPos(null);
          setNearRemoval(false);
        }}
      >
        <div style={trayInnerStyle}>
          {inventoryEntries.map(([tool, count]) => (
            <div
              key={tool}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <button
                onPointerDown={handleChipPointerDown(tool)}
                style={{
                  ...chipStyle,
                  cursor: dragTool === tool ? "grabbing" : "grab",
                  opacity: dragTool === tool ? 0.6 : 1,
                }}
                aria-label={`${TOOL_LABEL[tool]} (${count})`}
                title={`Drag to canvas to place. Count: ${count}`}
              >
                <span style={chipLabelStyle}>{TOOL_LABEL[tool]}</span>
                <span style={chipCountStyle}>×{count}</span>
              </button>
            </div>
          ))}
        </div>
        {inventoryEntries.length > 0 && (
          <div style={hintStyle}>← drag to canvas • drag back to remove</div>
        )}
      </div>

      {dragPos && (
        <div
          style={{
            ...ghostStyle,
            left: `${dragPos.x - 20}px`,
            top: `${dragPos.y - 20}px`,
            background: nearRemoval ? "#d8cfbe" : "#f5efe6",
            opacity: nearRemoval ? 0.5 : 0.8,
          }}
        >
          {dragTool && TOOL_LABEL[dragTool]}
        </div>
      )}
    </>
  );
}

const trayStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 68,
  background: "rgba(234, 226, 213, 0.92)",
  borderTop: "1px solid #d8cfbe",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "6px 12px",
  pointerEvents: "auto",
  zIndex: 20,
  backdropFilter: "blur(4px)",
};

const trayInnerStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
  maxHeight: 40,
  overflowY: "auto",
};

const chipStyle: React.CSSProperties = {
  appearance: "none",
  background: "#f5efe6",
  border: "1px solid #d8cfbe",
  borderRadius: 6,
  padding: "4px 8px",
  minWidth: 60,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  fontSize: 11,
  fontWeight: 600,
  color: "#2a2520",
  fontFamily: "var(--display-font)",
  cursor: "grab",
  flexShrink: 0,
  transition: "background 120ms ease-out",
};

const chipLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const chipCountStyle: React.CSSProperties = {
  fontSize: 9,
  opacity: 0.75,
  fontVariantNumeric: "tabular-nums",
};

const hintStyle: React.CSSProperties = {
  fontSize: 9,
  color: "#5a4f43",
  opacity: 0.7,
  whiteSpace: "nowrap",
  letterSpacing: "0.04em",
};

const ghostStyle: React.CSSProperties = {
  position: "fixed",
  pointerEvents: "none",
  padding: "4px 8px",
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 600,
  color: "#2a2520",
  fontFamily: "var(--display-font)",
  transform: "rotate(-8deg)",
  zIndex: 100,
  transition: "background 120ms ease-out",
};
