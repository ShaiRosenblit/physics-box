import type { Id, Vec2, World } from "../simulation";

/**
 * Parts the player can place during the design phase. Mirrors the spawn
 * + connector tool ids from `ui/state/store.ts` minus "select" — kept as
 * its own union to avoid a circular import with the UI store.
 */
export type GameTool =
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

/** Axis-aligned rectangular target area in world space. */
export interface GoalZone {
  readonly id: string;
  readonly center: Vec2;
  /** Half-extents along x and y. */
  readonly halfExtents: Vec2;
  readonly label?: string;
}

/** Declarative goals — engine evaluates against snapshots, no per-level callbacks. */
export type Goal =
  | {
      readonly kind: "bodyInZone";
      readonly bodyRef: string;
      readonly zoneId: string;
    }
  | {
      readonly kind: "allBodiesInZone";
      readonly bodyRefs: readonly string[];
      readonly zoneId: string;
    };

export interface LevelHandles {
  /** Named refs into bodies created by `setupScene`, used by goals. */
  readonly trackedBodies: Readonly<Record<string, Id>>;
  /** Visual + win-condition zones. Identified by id. */
  readonly goalZones: readonly GoalZone[];
}

export interface Level {
  readonly id: string;
  readonly title: string;
  readonly goalText: string;
  /** Builds the initial scene; returns refs the goal references. */
  readonly setupScene: (world: World) => LevelHandles;
  /** Tools the player may use, with counts. Tools omitted are unavailable. */
  readonly palette: Readonly<Partial<Record<GameTool, number>>>;
  readonly goal: Goal;
  /**
   * Optional world-space rectangle the camera should always frame.
   * When omitted, the renderer falls back to fit-to-content from the
   * level's bodies. When set, content outside the rectangle is hidden.
   */
  readonly viewBounds?: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
}

export type GameMode = "sandbox" | "puzzle";
export type GamePhase = "design" | "running" | "won" | "lost";
