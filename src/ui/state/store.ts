import { create } from "zustand";
import type { Id, SceneName } from "../../simulation";

export type Tool =
  | "select"
  | "ball"
  | "box"
  | "ball+"
  | "ball-"
  | "magnet+"
  | "magnet-";

export interface UIState {
  tool: Tool;
  selectedId: Id | null;

  showGrid: boolean;
  showEField: boolean;
  showBField: boolean;

  hasCharges: boolean;
  hasMagnets: boolean;

  /** Toolbar drawer visibility (only consulted on tablet/phone). */
  toolsOpen: boolean;
  /** Inspector drawer visibility (only consulted on tablet/phone). */
  inspectorOpen: boolean;
  /** True while a body is actively being dragged via the canvas. */
  dragging: boolean;

  running: boolean;
  scene: SceneName;

  setTool: (tool: Tool) => void;
  setSelectedId: (id: Id | null) => void;
  toggleGrid: () => void;
  toggleEField: () => void;
  toggleBField: () => void;
  setHasCharges: (hasCharges: boolean) => void;
  setHasMagnets: (hasMagnets: boolean) => void;
  setToolsOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  setDragging: (dragging: boolean) => void;
  setRunning: (running: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  tool: "select",
  selectedId: null,

  showGrid: true,
  showEField: false,
  showBField: false,

  hasCharges: false,
  hasMagnets: false,

  toolsOpen: false,
  inspectorOpen: false,
  dragging: false,

  running: true,
  scene: "welcome",

  setTool: (tool) => set({ tool }),
  setSelectedId: (selectedId) => set({ selectedId }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleEField: () => set((s) => ({ showEField: !s.showEField })),
  toggleBField: () => set((s) => ({ showBField: !s.showBField })),
  setHasCharges: (hasCharges) =>
    set((s) => (s.hasCharges === hasCharges ? s : { hasCharges })),
  setHasMagnets: (hasMagnets) =>
    set((s) => (s.hasMagnets === hasMagnets ? s : { hasMagnets })),
  setToolsOpen: (toolsOpen) => set({ toolsOpen }),
  setInspectorOpen: (inspectorOpen) => set({ inspectorOpen }),
  setDragging: (dragging) =>
    set((s) => (s.dragging === dragging ? s : { dragging })),
  setRunning: (running) => set({ running }),
}));
