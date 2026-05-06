import { useUIStore } from "../../ui/state/store";

export interface WinScreenProps {
  readonly onReplay: () => void;
}

/**
 * Modal shown when phase === "won". Click Replay to reload the level.
 * Click anywhere outside to dismiss to design phase (still reloads).
 */
export function WinScreen({ onReplay }: WinScreenProps) {
  const mode = useUIStore((s) => s.mode);
  const phase = useUIStore((s) => s.phase);
  if (mode !== "puzzle" || phase !== "won") return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Level solved"
      data-testid="win-screen"
      style={overlayStyle}
      onClick={onReplay}
    >
      <div style={cardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={badgeStyle}>Solved!</div>
        <button
          type="button"
          style={replayBtnStyle}
          onClick={onReplay}
          data-testid="win-replay"
        >
          Replay
        </button>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255, 250, 234, 0.55)",
  backdropFilter: "blur(2px)",
  WebkitBackdropFilter: "blur(2px)",
  zIndex: 30,
};

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 18,
  padding: "26px 32px",
  background: "transparent",
  animation: "winBadgeIn 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
};

// Sticker-style badge: thick ink outline, hard offset shadow (not blurred —
// reads as a sticker pasted on the world), slight rotation, bright fill.
const badgeStyle: React.CSSProperties = {
  fontFamily: "var(--display-font)",
  fontSize: 44,
  fontWeight: 800,
  color: "#2b2233",
  letterSpacing: "0.01em",
  background: "#ffd96b",
  padding: "14px 28px",
  borderRadius: 28,
  border: "3px solid #2b2233",
  boxShadow: "0 6px 0 #2b2233",
  transform: "rotate(-4deg)",
};

const replayBtnStyle: React.CSSProperties = {
  appearance: "none",
  border: "3px solid #2b2233",
  background: "#6fcf97",
  color: "#2b2233",
  fontFamily: "var(--display-font)",
  fontSize: 18,
  fontWeight: 700,
  padding: "12px 28px",
  borderRadius: 999,
  cursor: "pointer",
  boxShadow: "0 4px 0 #2b2233",
};
