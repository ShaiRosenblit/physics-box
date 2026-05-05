import { useEffect } from "react";

export type DrawerSide = "left" | "right" | "bottom";

export interface DrawerProps {
  open: boolean;
  side: DrawerSide;
  onDismiss: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  /** Test id surfaced on the drawer panel. */
  testId?: string;
  /** Optional max width / height for the panel (px). */
  size?: number;
}

/**
 * Slide-in drawer used by Toolbar/Inspector on tablet and phone modes.
 *
 * Implementation notes:
 * - Renders inline (not portaled) so existing testids stay reachable.
 * - Panel keeps its own slide transform; backdrop fades alongside it.
 * - When closed, the whole stack is `pointer-events: none` so it never
 *   intercepts canvas gestures.
 * - Esc dismisses while open; outside-click hits the backdrop directly.
 */
export function Drawer(props: DrawerProps) {
  const { open, side, onDismiss } = props;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  const panelTransform = open
    ? "translate(0, 0)"
    : side === "left"
    ? "translateX(-100%)"
    : side === "right"
    ? "translateX(100%)"
    : "translateY(100%)";

  const panelPosition: React.CSSProperties =
    side === "bottom"
      ? {
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: props.size ? `${props.size}px` : "60vh",
          borderTop: "1px solid #d8cfbe",
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
        }
      : {
          top: 0,
          bottom: 0,
          [side]: 0,
          width: props.size ? `${props.size}px` : "clamp(220px, 78vw, 320px)",
          maxWidth: "78vw",
          borderRight: side === "left" ? "1px solid #d8cfbe" : undefined,
          borderLeft: side === "right" ? "1px solid #d8cfbe" : undefined,
        };

  return (
    <div
      style={{
        ...overlayStyle,
        pointerEvents: open ? "auto" : "none",
      }}
      aria-hidden={open ? undefined : true}
    >
      <div
        onClick={onDismiss}
        style={{
          ...backdropStyle,
          opacity: open ? 1 : 0,
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={props.ariaLabel}
        data-testid={props.testId}
        data-state={open ? "open" : "closed"}
        style={{
          ...panelBaseStyle,
          ...panelPosition,
          transform: panelTransform,
        }}
      >
        {props.children}
      </aside>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 20,
};

const backdropStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(42, 37, 32, 0.32)",
  transition: "opacity 180ms ease-out",
};

const panelBaseStyle: React.CSSProperties = {
  position: "absolute",
  background: "#eae2d5",
  color: "#2a2520",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 4px 32px rgba(42,37,32,0.18)",
  transition: "transform 200ms cubic-bezier(0.32, 0.72, 0.32, 1)",
};
