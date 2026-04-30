import type { ComponentType, CSSProperties, SVGProps } from "react";

type IconC = ComponentType<SVGProps<SVGSVGElement>>;

export interface ToolGlyphProps {
  readonly icon: IconC;
  /** Vite-resolved URL for a PNG/WebP thumb; falls back to `icon` when absent. */
  readonly thumbSrc?: string;
}

const imgStyle: CSSProperties = {
  display: "block",
  width: 16,
  height: 16,
  objectFit: "contain",
  flexShrink: 0,
  pointerEvents: "none",
};

/**
 * Toolbar / rail slot: workshop-style raster when available, else stroke SVG.
 */
export function ToolGlyph(props: ToolGlyphProps) {
  const Icon = props.icon;
  if (props.thumbSrc) {
    return (
      <img
        src={props.thumbSrc}
        alt=""
        width={16}
        height={16}
        decoding="async"
        draggable={false}
        style={imgStyle}
      />
    );
  }
  return <Icon />;
}
