import { create } from "zustand";
import {
  defaultSceneName,
  PULLEY_DEFAULT_HALF_SPREAD,
  type Id,
  type MaterialName,
  type SceneName,
  type Vec2,
  type AnyBodySpec,
} from "../../simulation";
import type {
  GameMode,
  GamePhase,
  GameTool,
  LevelHandles,
} from "../../game/types";
import { defaultLevelId } from "../../game";

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

/** Metadata for a body placed by the player in puzzle mode. */
export interface PlacedItemMeta {
  /** Which tool was used to place this. */
  tool: GameTool;
  /** Whether this body should be fixed (static) when simulation runs. */
  fixedWhenRunning: boolean;
  /** Original body spec at the time of placement (for undo/restart). */
  spec: AnyBodySpec;
}

/** Undo stack entry for reverting placement or removal. */
export type UndoEntry =
  | { kind: "place"; id: Id; tool: GameTool }
  | { kind: "remove"; spec: AnyBodySpec; tool: GameTool; position: Vec2 };

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

  /** Top-level game mode — sandbox keeps today's free-play UX; puzzle activates levels. */
  mode: GameMode;
  /** Puzzle-mode lifecycle: design (paused, placing) → running → won/lost. */
  phase: GamePhase;
  /** Active level id when in puzzle mode. */
  currentLevelId: string | null;
  /** Remaining counts for each tool the level allows. */
  inventory: Partial<Record<GameTool, number>>;
  /** Tools attached to bodies the player has placed this attempt — for refund on delete. */
  placedByPlayer: Readonly<Record<number, GameTool>>;
  /** Tracked refs and goal zones from the active level setup. */
  levelHandles: LevelHandles | null;
  /** Metadata for each placed body (fixed-when-running flag, original spec). */
  placedItemMeta: Readonly<Record<number, PlacedItemMeta>>;
  /** Undo stack for reversing placements/removals in puzzle design phase. */
  undoStack: readonly UndoEntry[];

  setMode: (mode: GameMode) => void;
  setPhase: (phase: GamePhase) => void;
  setCurrentLevelId: (id: string | null) => void;
  setInventory: (inv: Partial<Record<GameTool, number>>) => void;
  setLevelHandles: (h: LevelHandles | null) => void;
  /** Returns true if the count was decremented; false if no inventory or empty. */
  consumeInventory: (tool: GameTool, placedId: Id, meta: PlacedItemMeta) => boolean;
  /** Restore inventory when a player-placed body is removed. */
  refundInventory: (placedId: Id) => void;
  /** Clear all placed item metadata (used on level reset). */
  clearPlacedItemMeta: () => void;
  /** Clear undo stack. */
  clearUndo: () => void;
  /** Push an undo entry onto the stack. */
  pushUndo: (entry: UndoEntry) => void;
  /** Pop the last undo entry and return it. */
  popUndo: () => UndoEntry | null;

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

  mode: "puzzle",
  phase: "design",
  currentLevelId: defaultLevelId,
  inventory: {},
  placedByPlayer: {},
  levelHandles: null,
  placedItemMeta: {},
  undoStack: [],

  setMode: (mode) => set({ mode }),
  setPhase: (phase) => set({ phase }),
  setCurrentLevelId: (currentLevelId) => set({ currentLevelId }),
  setInventory: (inventory) => set({ inventory }),
  setLevelHandles: (levelHandles) => set({ levelHandles }),
  consumeInventory: (tool, placedId, meta) => {
    let consumed = false;
    set((s) => {
      const remaining = s.inventory[tool] ?? 0;
      if (remaining <= 0) return s;
      consumed = true;
      return {
        inventory: { ...s.inventory, [tool]: remaining - 1 },
        placedByPlayer: { ...s.placedByPlayer, [placedId]: tool },
        placedItemMeta: { ...s.placedItemMeta, [placedId]: meta },
      };
    });
    return consumed;
  },
  refundInventory: (placedId) =>
    set((s) => {
      const tool = s.placedByPlayer[placedId];
      if (!tool) return s;
      const next = { ...s.placedByPlayer };
      delete next[placedId];
      const nextMeta = { ...s.placedItemMeta };
      delete nextMeta[placedId];
      return {
        placedByPlayer: next,
        placedItemMeta: nextMeta,
        inventory: {
          ...s.inventory,
          [tool]: (s.inventory[tool] ?? 0) + 1,
        },
      };
    }),

  clearPlacedItemMeta: () => set({ placedItemMeta: {} }),
  clearUndo: () => set({ undoStack: [] }),
  pushUndo: (entry) =>
    set((s) => ({
      undoStack: [...s.undoStack.slice(-19), entry].slice(-20),
    })),
  popUndo: () => {
    let popped: UndoEntry | null = null;
    set((s) => {
      if (s.undoStack.length === 0) return s;
      const newStack = [...s.undoStack];
      popped = newStack.pop() ?? null;
      return { undoStack: newStack };
    });
    return popped;
  },

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
