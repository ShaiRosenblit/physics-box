/**
 * Stable selectors for Playwright MCP smoke tests and accessibility tooling.
 * Treat these as a public contract — do not change without updating tests.
 */
export const testIds = {
  app: "app-root",
  toolbar: "toolbar",
  inspector: "inspector",
  playbackBar: "playback-bar",
  canvasHost: "canvas-host",
  tickCounter: "tick-counter",

  toolButtonPrefix: "tool-",
  toggleGrid: "toggle-grid",
  toggleEField: "toggle-e-field",
  toggleBField: "toggle-b-field",

  buttonPlay: "button-play",
  buttonPause: "button-pause",
  buttonStep: "button-step",
  buttonReset: "button-reset",
} as const;
