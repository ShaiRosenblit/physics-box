import { create } from "zustand";
import {
  defaultSceneName,
  type Id,
  type MaterialName,
  type SceneName,
} from "../../simulation";

export type Tool =
  | "select"
  | "ball"
  | "box"
  | "ball+"
  | "ball-"
  | "magnet+"
  | "magnet-"
  | "rope"
  | "hinge"
  | "spring"
  | "pulley";

/** Default parameters used the next time a spawn tool places a body. */
export interface NeutralBallSpawnPreset {
  radius: number;
  material: MaterialName;
  linearDamping: number;
  angularDamping: number;
  collideDynamicBalls: boolean;
}

export interface ChargedBallSpawnPreset extends NeutralBallSpawnPreset {
  charge: number;
}

export interface MagnetSpawnPreset {
  radius: number;
  dipoleMagnitude: number;
}

export interface BoxSpawnPreset {
  width: number;
  height: number;
  material: MaterialName;
  linearDamping: number;
  angularDamping: number;
}

export type SpawnPresetsBundle = {
  ball: NeutralBallSpawnPreset;
  ballPlus: ChargedBallSpawnPreset;
  ballMinus: ChargedBallSpawnPreset;
  magnetPlus: MagnetSpawnPreset;
  magnetMinus: MagnetSpawnPreset;
  box: BoxSpawnPreset;
};

export type SpawnPresetKey = keyof SpawnPresetsBundle;

export function createDefaultSpawnPresets(): SpawnPresetsBundle {
  return {
    ball: {
      radius: 0.4,
      material: "wood",
      linearDamping: 0,
      angularDamping: 0,
      collideDynamicBalls: true,
    },
    ballPlus: {
      radius: 0.32,
      material: "metal",
      linearDamping: 0,
      angularDamping: 0,
      collideDynamicBalls: true,
      charge: 4,
    },
    ballMinus: {
      radius: 0.32,
      material: "metal",
      linearDamping: 0,
      angularDamping: 0,
      collideDynamicBalls: true,
      charge: -4,
    },
    magnetPlus: {
      radius: 0.32,
      dipoleMagnitude: 12,
    },
    magnetMinus: {
      radius: 0.32,
      dipoleMagnitude: 12,
    },
    box: {
      width: 0.7,
      height: 0.7,
      material: "wood",
      linearDamping: 0,
      angularDamping: 0,
    },
  };
}

/** Connector tools place a constraint over two clicks rather than spawning a body. */
export const CONNECTOR_TOOLS: ReadonlySet<Tool> = new Set<Tool>([
  "rope",
  "hinge",
  "spring",
  "pulley",
]);

export function isConnectorTool(tool: Tool): tool is "rope" | "hinge" | "spring" | "pulley" {
  return CONNECTOR_TOOLS.has(tool);
}

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

  /** Per-tool defaults merged into spawned `BodySpec`s (placement only). */
  spawnPresets: SpawnPresetsBundle;

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
  setScene: (scene: SceneName) => void;
  setSpawnPresetPartial: <K extends SpawnPresetKey>(
    key: K,
    partial: Partial<SpawnPresetsBundle[K]>,
  ) => void;
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
  scene: defaultSceneName,

  spawnPresets: createDefaultSpawnPresets(),

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
  setScene: (scene) => set({ scene }),
  setSpawnPresetPartial: (key, partial) =>
    set((state) => ({
      spawnPresets: {
        ...state.spawnPresets,
        [key]: { ...state.spawnPresets[key], ...partial },
      },
    })),
}));
