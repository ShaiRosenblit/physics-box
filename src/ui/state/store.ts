import { create } from "zustand";
import type { Id, SceneName } from "../../simulation";

export type Tool = "select" | "ball" | "box";

export interface UIState {
  tool: Tool;
  selectedId: Id | null;

  showGrid: boolean;
  showEField: boolean;
  showBField: boolean;

  running: boolean;
  scene: SceneName;

  setTool: (tool: Tool) => void;
  setSelectedId: (id: Id | null) => void;
  toggleGrid: () => void;
  toggleEField: () => void;
  toggleBField: () => void;
  setRunning: (running: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  tool: "select",
  selectedId: null,

  showGrid: true,
  showEField: true,
  showBField: true,

  running: true,
  scene: "welcome",

  setTool: (tool) => set({ tool }),
  setSelectedId: (selectedId) => set({ selectedId }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleEField: () => set((s) => ({ showEField: !s.showEField })),
  toggleBField: () => set((s) => ({ showBField: !s.showBField })),
  setRunning: (running) => set({ running }),
}));
