import type { Tool } from "../../state/store";
import ballThumb from "./tool-thumb-ball.png";
import boxThumb from "./tool-thumb-box.png";
import magnetThumb from "./tool-thumb-magnet.png";

/**
 * Raster toolbar thumbs (see VISUAL_GUIDELINES.md, Asset pipeline).
 * Keys omitted here still use inline SVG icons.
 */
export const bodyToolThumbSrc: Partial<Record<Tool, string>> = {
  ball: ballThumb,
  box: boxThumb,
  "magnet+": magnetThumb,
  "magnet-": magnetThumb,
};
