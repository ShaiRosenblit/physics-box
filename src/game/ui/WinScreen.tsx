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
  background: "rgba(245, 239, 230, 0.55)",
  backdropFilter: "blur(2px)",
  WebkitBackdropFilter: "blur(2px)",
  zIndex: 30,
};

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 16,
  padding: "24px 28px",
  background: "#f5efe6",
  border: "1px solid #d8cfbe",
  borderRadius: 16,
  boxShadow: "0 12px 40px rgba(42,37,32,0.18)",
};

const badgeStyle: React.CSSProperties = {
  fontFamily: "var(--display-font)",
  fontSize: 36,
  fontWeight: 700,
  color: "#2a6e47",
  letterSpacing: "0.01em",
};

const replayBtnStyle: React.CSSProperties = {
  appearance: "none",
  border: "1px solid #2a6e47",
  background: "#3a8c5e",
  color: "#f5efe6",
  fontFamily: "var(--display-font)",
  fontSize: 16,
  fontWeight: 600,
  padding: "10px 22px",
  borderRadius: 999,
  cursor: "pointer",
};
