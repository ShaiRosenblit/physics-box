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
  toggleGravity: "toggle-gravity",

  buttonPlay: "button-play",
  buttonPause: "button-pause",
  buttonStep: "button-step",
  buttonReset: "button-reset",
  sceneSelect: "scene-select",

  fabTools: "fab-tools",
  fabInspector: "fab-inspector",
  drawerTools: "drawer-tools",
  drawerInspector: "drawer-inspector",
  inspectorPeek: "inspector-peek",
  buttonFitView: "button-fit-view",
  spawnToolOptions: "spawn-tool-options",
  connectorToolOptions: "connector-tool-options",
} as const;
