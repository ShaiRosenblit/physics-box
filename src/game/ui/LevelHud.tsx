import { levelById } from "../levels";
import { useUIStore } from "../../ui/state/store";
import { useViewportMode } from "../../ui/hooks/useViewportMode";

export interface LevelHudProps {
  readonly onUndo?: () => void;
}

/**
 * Top-center heads-up display shown only in puzzle mode. Title + goal +
 * undo button. Inventory chips are now in the bottom tray. Stays invisible
 * in sandbox mode so the existing UX is unchanged.
 */
export function LevelHud(props?: LevelHudProps) {
  const mode = useUIStore((s) => s.mode);
  const currentLevelId = useUIStore((s) => s.currentLevelId);
  const phase = useUIStore((s) => s.phase);
  const undoStack = useUIStore((s) => s.undoStack);
  const isPhone = useViewportMode() === "phone";

  if (mode !== "puzzle" || !currentLevelId) return null;
  const level = levelById[currentLevelId];
  if (!level) return null;

  return (
    <div
      data-testid="level-hud"
      style={isPhone ? hudPhoneStyle : hudStyle}
      aria-live="polite"
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={isPhone ? titlePhoneStyle : titleStyle}>{level.title}</div>
          {/* The goal is essential gameplay info, so it stays visible on every
              viewport. On phone we use a thinner pill with a smaller font and
              cap to two lines (with ellipsis for unusually long goals) so it
              stays compact relative to the canvas. */}
          <div style={isPhone ? goalPhoneStyle : goalStyle}>{level.goalText}</div>
        </div>
        {phase === "design" && undoStack.length > 0 && (
          <button
            onClick={props?.onUndo}
            style={undoButtonStyle}
            aria-label="Undo"
            title="Undo last placement"
          >
            ↩
          </button>
        )}
      </div>
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
  // FAB inner edge sits at 56 px from the screen edge (12 gutter + 44 fab),
  // so 60 px each side keeps a 4 px breathing gap. That leaves 200 px for
  // the goal text on iPhone-SE (320), which is just enough for two lines.
  maxWidth: "calc(100% - 120px)",
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

// Phone goal pill — narrower padding, smaller font, capped at two lines.
// `-webkit-line-clamp` gives us a graceful overflow story for any future
// level whose goal text doesn't fit a single line on iPhone-SE width.
const goalPhoneStyle: React.CSSProperties = {
  fontFamily: "var(--display-font)",
  fontSize: 11,
  fontWeight: 500,
  color: "#5a4f43",
  background: "rgba(245, 239, 230, 0.85)",
  padding: "3px 10px",
  borderRadius: 12,
  border: "1px solid #d8cfbe",
  lineHeight: 1.3,
  maxWidth: "100%",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
  wordBreak: "break-word",
};

const undoButtonStyle: React.CSSProperties = {
  appearance: "none",
  background: "#f5efe6",
  border: "1px solid #d8cfbe",
  borderRadius: 6,
  padding: "4px 10px",
  fontSize: 16,
  fontWeight: 600,
  color: "#2a2520",
  cursor: "pointer",
  flexShrink: 0,
  transition: "background 120ms ease-out",
  minWidth: 40,
  textAlign: "center",
};

const hintStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#5a4f43",
  letterSpacing: "0.04em",
  marginTop: 2,
};
