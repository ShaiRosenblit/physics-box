import { levelById } from "../levels";
import { useUIStore } from "../../ui/state/store";
import { useViewportMode } from "../../ui/hooks/useViewportMode";
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

/**
 * Top-center heads-up display shown only in puzzle mode. Title + goal +
 * inventory chips. Stays invisible in sandbox mode so the existing UX
 * is unchanged.
 */
export function LevelHud() {
  const mode = useUIStore((s) => s.mode);
  const currentLevelId = useUIStore((s) => s.currentLevelId);
  const phase = useUIStore((s) => s.phase);
  const inventory = useUIStore((s) => s.inventory);
  const isPhone = useViewportMode() === "phone";

  if (mode !== "puzzle" || !currentLevelId) return null;
  const level = levelById[currentLevelId];
  if (!level) return null;

  const inventoryEntries = Object.entries(inventory) as Array<
    [GameTool, number]
  >;

  return (
    <div
      data-testid="level-hud"
      style={isPhone ? hudPhoneStyle : hudStyle}
      aria-live="polite"
    >
      <div style={isPhone ? titlePhoneStyle : titleStyle}>{level.title}</div>
      {/* On phone we drop the long goal/hint text from the top HUD — it
          stole 30-40 % of canvas height on small screens. The full goal
          stays available in the level title (for context) and the design
          phase hint is implicit in the visible Play button. */}
      {!isPhone && <div style={goalStyle}>{level.goalText}</div>}
      {inventoryEntries.length > 0 && (
        <div
          style={isPhone ? inventoryRowPhoneStyle : inventoryRowStyle}
          // Allow horizontal scroll on phone for many-item inventories
          // without forcing them to wrap into 3+ lines.
        >
          {inventoryEntries.map(([tool, count]) => (
            <span
              key={tool}
              style={count > 0 ? chipStyle : chipEmptyStyle}
              data-testid={`inventory-${tool}`}
            >
              <span>{TOOL_LABEL[tool]}</span>
              <span style={chipCountStyle}>×{count}</span>
            </span>
          ))}
        </div>
      )}
      {phase === "design" && !isPhone && (
        <div style={hintStyle}>
          Place your parts, then press <strong>Run</strong>.
        </div>
      )}
    </div>
  );
}

const hudStyle: React.CSSProperties = {
  position: "absolute",
  // Push HUD below the FAB row on phones (FABs sit at top: 12 + 44 tall).
  // Desktop has no FABs, so 12px is enough — but the larger inset is fine.
  top: "calc(12px + env(safe-area-inset-top))",
  left: "50%",
  transform: "translateX(-50%)",
  pointerEvents: "none",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  zIndex: 12,
  // Reserve room for the two FABs (each ~56px from screen edge incl. gutter).
  maxWidth: "min(560px, calc(100% - 128px))",
  textAlign: "center",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--display-font)",
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: "0.01em",
  color: "#2a2520",
  background: "rgba(245, 239, 230, 0.92)",
  padding: "6px 16px",
  borderRadius: 999,
  border: "1px solid #d8cfbe",
  boxShadow: "0 2px 12px rgba(42,37,32,0.10)",
};

// Compact phone variants — same look, smaller footprint.
const hudPhoneStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(12px + env(safe-area-inset-top))",
  left: "50%",
  transform: "translateX(-50%)",
  pointerEvents: "none",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  zIndex: 12,
  // Reserve room for both corner FABs (each ~56px from edge incl. gutter).
  maxWidth: "calc(100% - 128px)",
  textAlign: "center",
};

const titlePhoneStyle: React.CSSProperties = {
  fontFamily: "var(--display-font)",
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "0.01em",
  color: "#2a2520",
  background: "rgba(245, 239, 230, 0.92)",
  padding: "4px 12px",
  borderRadius: 999,
  border: "1px solid #d8cfbe",
  boxShadow: "0 2px 10px rgba(42,37,32,0.10)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%",
};

const inventoryRowPhoneStyle: React.CSSProperties = {
  display: "flex",
  gap: 4,
  marginTop: 0,
  // Inventory chips can scroll horizontally on phone — beats wrapping into
  // a multi-line block that eats canvas height when a level has many tools.
  maxWidth: "100%",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  pointerEvents: "auto",
  paddingBottom: 2,
};

const goalStyle: React.CSSProperties = {
  fontFamily: "var(--display-font)",
  fontSize: 14,
  fontWeight: 500,
  color: "#5a4f43",
  background: "rgba(245, 239, 230, 0.85)",
  padding: "4px 14px",
  borderRadius: 999,
  border: "1px solid #d8cfbe",
};

const inventoryRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: 6,
  marginTop: 2,
};

const chipBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontFamily: "var(--display-font)",
  fontWeight: 600,
  border: "1px solid #d8cfbe",
  flexShrink: 0,
  whiteSpace: "nowrap",
};

const chipStyle: React.CSSProperties = {
  ...chipBase,
  background: "#f5efe6",
  color: "#2a2520",
};

const chipEmptyStyle: React.CSSProperties = {
  ...chipBase,
  background: "#eae2d5",
  color: "#9a9189",
  textDecoration: "line-through",
};

const chipCountStyle: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  opacity: 0.85,
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#5a4f43",
  letterSpacing: "0.04em",
  marginTop: 2,
};
