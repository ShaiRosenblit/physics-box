import { create } from "zustand";
import {
  defaultSceneName,
  PULLEY_DEFAULT_HALF_SPREAD,
  type Id,
  type MaterialName,
  type SceneName,
} from "../../simulation";

export type Tool =
  | "select"
  | "ball"
  | "balloon"
  | "box"
  | "crank"
  | "ball+"
  | "ball-"
  | "magnet+"
  | "magnet-"
  | "engine+"
  | "engine-"
  | "rope"
  | "hinge"
  | "spring"
  | "pulley"
  | "belt"
  | "bar";

/** Default parameters used the next time a spawn tool places a body. */
export interface NeutralBallSpawnPreset {
  radius: number;
  material: MaterialName;
  linearDamping: number;
  angularDamping: number;
  collideDynamicBalls: boolean;
  /** Static in world (walls, pegs); same as inspector "Fixed (static)". */
  fixed: boolean;
}

export interface ChargedBallSpawnPreset extends NeutralBallSpawnPreset {
  charge: number;
}

export interface MagnetSpawnPreset {
  radius: number;
  dipoleMagnitude: number;
  fixed: boolean;
}

export interface BoxSpawnPreset {
  width: number;
  height: number;
  material: MaterialName;
  linearDamping: number;
  angularDamping: number;
  fixed: boolean;
}

export interface BalloonSpawnPreset {
  radius: number;
  material: MaterialName;
  linearDamping: number;
  angularDamping: number;
  collideDynamicBalls: boolean;
  buoyancyLift: number;
  fixed: boolean;
}

export interface EngineSpawnPreset {
  width: number;
  height: number;
  flywheelRadius: number;
  /** Unsigned rpm before tool sign; clamped to maxRpm at spawn. */
  rpm: number;
  /** Stall torque magnitude (N·m); clamped to maxMotorTorque at spawn. */
  maxTorque: number;
  material: MaterialName;
  linearDamping: number;
  angularDamping: number;
  fixed: boolean;
}

export interface CrankSpawnPreset {
  radius: number;
  /** Pin distance along body +x from hub (m); clamped inside wheel on spawn. */
  pinRadius: number;
  material: MaterialName;
  linearDamping: number;
  angularDamping: number;
  collideDynamicBalls: boolean;
  fixed: boolean;
}

export type SpawnPresetsBundle = {
  ball: NeutralBallSpawnPreset;
  ballPlus: ChargedBallSpawnPreset;
  ballMinus: ChargedBallSpawnPreset;
  magnetPlus: MagnetSpawnPreset;
  magnetMinus: MagnetSpawnPreset;
  enginePlus: EngineSpawnPreset;
  engineMinus: EngineSpawnPreset;
  box: BoxSpawnPreset;
  balloon: BalloonSpawnPreset;
  crank: CrankSpawnPreset;
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
      fixed: false,
    },
    ballPlus: {
      radius: 0.32,
      material: "metal",
      linearDamping: 0,
      angularDamping: 0,
      collideDynamicBalls: true,
      fixed: false,
      charge: 4,
    },
    ballMinus: {
      radius: 0.32,
      material: "metal",
      linearDamping: 0,
      angularDamping: 0,
      collideDynamicBalls: true,
      fixed: false,
      charge: -4,
    },
    magnetPlus: {
      radius: 0.32,
      dipoleMagnitude: 12,
      fixed: false,
    },
    magnetMinus: {
      radius: 0.32,
      dipoleMagnitude: 12,
      fixed: false,
    },
    enginePlus: {
      width: 0.42,
      height: 0.26,
      flywheelRadius: 0.1,
      rpm: 120,
      maxTorque: 500,
      material: "metal",
      linearDamping: 0,
      angularDamping: 0,
      fixed: false,
    },
    engineMinus: {
      width: 0.42,
      height: 0.26,
      flywheelRadius: 0.1,
      rpm: 120,
      maxTorque: 500,
      material: "metal",
      linearDamping: 0,
      angularDamping: 0,
      fixed: false,
    },
    box: {
      width: 0.7,
      height: 0.7,
      material: "wood",
      linearDamping: 0,
      angularDamping: 0,
      fixed: false,
    },
    balloon: {
      radius: 0.32,
      material: "latex",
      linearDamping: 0.35,
      angularDamping: 0.25,
      collideDynamicBalls: true,
      buoyancyLift: 1,
      fixed: false,
    },
    crank: {
      radius: 0.22,
      pinRadius: 0.14,
      material: "metal",
      linearDamping: 0,
      angularDamping: 0.15,
      collideDynamicBalls: true,
      fixed: false,
    },
  };
}

export interface RopeConnectorPreset {
  segments: number;
  material: MaterialName;
}

export interface SpringConnectorPreset {
  frequencyHz: number;
  dampingRatio: number;
}

export interface PulleyConnectorPreset {
  halfSpread: number;
  ratio: number;
}

export type ConnectorPresetsBundle = {
  rope: RopeConnectorPreset;
  spring: SpringConnectorPreset;
  pulley: PulleyConnectorPreset;
};

export type ConnectorPresetKey = keyof ConnectorPresetsBundle;

export function createDefaultConnectorPresets(): ConnectorPresetsBundle {
  return {
    rope: { segments: 12, material: "wood" },
    spring: { frequencyHz: 4, dampingRatio: 0.5 },
    pulley: { halfSpread: PULLEY_DEFAULT_HALF_SPREAD, ratio: 1 },
  };
}

export function connectorEligiblePresetTool(
  tool: Tool,
): ConnectorPresetKey | null {
  if (tool === "rope" || tool === "spring" || tool === "pulley") return tool;
  return null;
}

/** Connector tools place a constraint over two clicks rather than spawning a body. */
export const CONNECTOR_TOOLS: ReadonlySet<Tool> = new Set<Tool>([
  "rope",
  "hinge",
  "spring",
  "pulley",
  "belt",
  "bar",
]);

export function isConnectorTool(
  tool: Tool,
): tool is "rope" | "hinge" | "spring" | "pulley" | "belt" | "bar" {
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
  /** Defaults merged into the next rope / spring / pulley placement only. */
  connectorPresets: ConnectorPresetsBundle;

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
  setConnectorPresetPartial: <K extends ConnectorPresetKey>(
    key: K,
    partial: Partial<ConnectorPresetsBundle[K]>,
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
  connectorPresets: createDefaultConnectorPresets(),

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
  setConnectorPresetPartial: (key, partial) =>
    set((state) => ({
      connectorPresets: {
        ...state.connectorPresets,
        [key]: { ...state.connectorPresets[key], ...partial },
      },
    })),
}));
