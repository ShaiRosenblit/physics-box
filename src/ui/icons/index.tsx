/**
 * Inline SVG icon set. Each icon is 16x16, single-stroke, currentColor.
 * Stays consistent with palette tokens because every consumer sets
 * `color` via the surrounding button style (per `02-visual.mdc`).
 *
 * Keeping them inline avoids a heavy icon dependency and lets us tune
 * stroke weights to match the body outlines.
 */
import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

const baseProps: Props = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Svg({ children, ...rest }: Props) {
  return (
    <svg {...baseProps} {...rest} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const SelectIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M3 2.5l4.5 11 1.7-4.6 4.6-1.7L3 2.5z" />
  </Svg>
);

export const BallIcon = (p: Props) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5" />
    <path d="M5 7.5c1-1.4 3.5-1.6 5.5-.4" strokeWidth="1" opacity="0.6" />
  </Svg>
);

export const BoxIcon = (p: Props) => (
  <Svg {...p}>
    <rect x="3" y="3" width="10" height="10" rx="1.2" />
  </Svg>
);

export const ChargePlusIcon = (p: Props) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M8 5v6M5 8h6" />
  </Svg>
);

export const ChargeMinusIcon = (p: Props) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M5 8h6" />
  </Svg>
);

export const MagnetNIcon = (p: Props) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M2.7 8h10.6" strokeWidth="1.1" opacity="0.65" />
    <text
      x="8"
      y="6.6"
      fontSize="4.6"
      fontWeight="600"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
    >
      N
    </text>
  </Svg>
);

export const MagnetSIcon = (p: Props) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M2.7 8h10.6" strokeWidth="1.1" opacity="0.65" />
    <text
      x="8"
      y="12.4"
      fontSize="4.6"
      fontWeight="600"
      textAnchor="middle"
      fill="currentColor"
      stroke="none"
    >
      S
    </text>
  </Svg>
);

export const GridIcon = (p: Props) => (
  <Svg {...p}>
    <rect x="2.5" y="2.5" width="11" height="11" />
    <path d="M2.5 6h11M2.5 10h11M6 2.5v11M10 2.5v11" strokeWidth="1" />
  </Svg>
);

export const EFieldIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M3 12c2-4 4-6 6-6s2.5 2 4 0" />
    <path d="M3 8c2-3 4-4 6-4" opacity="0.5" />
    <circle cx="3" cy="12" r="0.6" fill="currentColor" stroke="none" />
  </Svg>
);

export const BFieldIcon = (p: Props) => (
  <Svg {...p}>
    <ellipse cx="8" cy="8" rx="5.5" ry="2.4" />
    <ellipse cx="8" cy="8" rx="3" ry="1.2" opacity="0.55" />
  </Svg>
);

export const PlayIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M5 3.5l7 4.5-7 4.5z" fill="currentColor" stroke="none" />
  </Svg>
);

export const PauseIcon = (p: Props) => (
  <Svg {...p}>
    <rect x="4.5" y="3.5" width="2.4" height="9" rx="0.5" fill="currentColor" stroke="none" />
    <rect x="9.1" y="3.5" width="2.4" height="9" rx="0.5" fill="currentColor" stroke="none" />
  </Svg>
);

export const StepIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M4 3.5l5.5 4.5L4 12.5z" fill="currentColor" stroke="none" />
    <path d="M11.5 3.5v9" strokeWidth="1.6" />
  </Svg>
);

export const ResetIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M3 8a5 5 0 1 1 1.6 3.6" />
    <path d="M3 4v3.5h3.5" />
  </Svg>
);

export const ToolsIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M2.5 13.5l5-5" />
    <path d="M9.5 6.5l3-3M11 1.5l3.5 3.5L11 8.5 7.5 5 11 1.5z" />
  </Svg>
);

export const InspectorIcon = (p: Props) => (
  <Svg {...p}>
    <circle cx="7" cy="7" r="4" />
    <path d="M10 10l3.5 3.5" />
  </Svg>
);

export const CloseIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Svg>
);

export const FitViewIcon = (p: Props) => (
  <Svg {...p}>
    <path d="M2.5 5.5V2.5h3M13.5 5.5V2.5h-3M2.5 10.5v3h3M13.5 10.5v3h-3" />
    <rect x="5.5" y="5.5" width="5" height="5" strokeWidth="1.1" opacity="0.65" />
  </Svg>
);
