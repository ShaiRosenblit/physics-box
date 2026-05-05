import { useEffect, useRef } from "react";
import type { Camera } from "../../render";
import type { Id, Vec2, World } from "../../simulation";

export type SpawnMode =
  | "ball"
  | "balloon"
  | "box"
  | "crank"
  | "ball+"
  | "ball-"
  | "magnet+"
  | "magnet-"
  | "engine+"
  | "engine-";
export type ConnectorTool = "rope" | "hinge" | "spring" | "pulley" | "belt" | "bar";

export type ConnectorPending =
  | {
      readonly tool: "rope" | "spring" | "hinge" | "belt" | "bar";
      readonly a: ResolvedAnchor;
    }
  | {
      readonly tool: "pulley";
      readonly stage: "center";
      readonly center: Vec2;
    }
  | {
      readonly tool: "pulley";
      readonly stage: "bodyA";
      readonly center: Vec2;
      readonly bodyA: Extract<ResolvedAnchor, { kind: "body" }>;
    };

/**
 * A click resolved against the world: either a hit on a dynamic body
 * (with the world-space hit point so the constraint anchors at the
 * exact place the user clicked) or an empty-space world point.
 */
export type ResolvedAnchor =
  | { readonly kind: "world"; readonly point: Vec2 }
  | { readonly kind: "body"; readonly id: Id; readonly hitPoint: Vec2 };

export interface PointerGestureCallbacks {
  /** Active world reference; required for drag and field sampling. */
  readonly world: World;
  /** Active camera; required for screen↔world conversion. */
  readonly getCamera: () => Camera | null;
  /** Optional: returns true if the given body id can be dragged (e.g., only player-placed items in puzzle mode). */
  readonly canDragBody?: (id: Id) => boolean;
  /** Spawn callback invoked on tap when a spawn tool is active. */
  readonly onSpawn: (mode: SpawnMode, worldPoint: Vec2) => void;
  /**
   * Connector commit fired when the second tap of a connector tool
   * resolves. The App composes a `ConstraintSpec` and calls
   * `world.addConstraint`. Implementations may reject (return false) if
   * the pair is invalid; the hook still clears the pending state.
   */
  readonly onConnectorCommit?: (
    tool: Exclude<ConnectorTool, "pulley">,
    a: ResolvedAnchor,
    b: ResolvedAnchor,
  ) => void;
  /** Pulley: tap wheel center (empty space), then body A, then body B. */
  readonly onPulleyCommit?: (
    center: Vec2,
    bodyA: ResolvedAnchor,
    bodyB: ResolvedAnchor,
  ) => void;
  /** Notified whenever the connector's pending anchor A changes. */
  readonly onConnectorPendingChange?: (pending: ConnectorPending | null) => void;
  /** Notified on pointer move while a connector is pending, for live preview. */
  readonly onConnectorPreviewMove?: (worldPoint: Vec2) => void;
  /** Returns the active tool id from the UI store. */
  readonly getTool: () => string;
  /** Body-selection callback fired whenever a drag begins or a tap misses. */
  readonly onSelect: (id: Id | null) => void;
  /** Optional: notified when a body drag starts/ends so the UI can react. */
  readonly onDragStateChange?: (active: boolean) => void;
  /** Optional: called when a dragged body is released above the tray area; should remove + refund it. */
  readonly onReturnToTray?: (id: Id) => void;
  /** Optional: returns the screen Y of the tray top edge, used to detect return-to-tray drops. */
  readonly getTrayBottom?: () => number;
}

function isConnectorTool(tool: string): ConnectorTool | null {
  if (
    tool === "rope" ||
    tool === "hinge" ||
    tool === "spring" ||
    tool === "pulley" ||
    tool === "belt"
  ) {
    return tool;
  }
  return null;
}

/** Hinge requires anchor A to be a body; everything else accepts both. */
function anchorValidForRole(
  tool: ConnectorTool,
  role: "a" | "b",
  anchor: ResolvedAnchor,
): boolean {
  if (tool === "belt" && role === "a" && anchor.kind !== "body") return false;
  return true;
}

function isBodyAnchor(
  anchor: ResolvedAnchor,
): anchor is Extract<ResolvedAnchor, { kind: "body" }> {
  return anchor.kind === "body";
}

const TAP_MOVEMENT_THRESHOLD = 6; // px

interface PointerSample {
  x: number;
  y: number;
}

interface SingleState {
  kind: "single";
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  totalMovement: number;
  /** Current resolved mode: starts as "pending", upgrades on first body-drag move. */
  mode: "pending" | "drag-body";
  draggedId: Id | null;
}

type GestureState = SingleState | null;

function isSpawnTool(tool: string): SpawnMode | null {
  if (
    tool === "ball" ||
    tool === "balloon" ||
    tool === "box" ||
    tool === "crank" ||
    tool === "ball+" ||
    tool === "ball-" ||
    tool === "magnet+" ||
    tool === "magnet-" ||
    tool === "engine+" ||
    tool === "engine-"
  ) {
    return tool;
  }
  return null;
}

/** When the canvas tool id is a spawn tool, returns its spawn mode. */
export function activeSpawnModeFromTool(tool: string): SpawnMode | null {
  return isSpawnTool(tool);
}

/**
 * Centralized pointer-gesture handler for the canvas host.
 *
 * The viewport is locked — there is no user pan or zoom. The supported
 * gestures are:
 *   - 1 pointer on a body → drag the body via the kernel mouse joint.
 *   - 1 pointer on empty space → tap (spawn / connector / deselect).
 *   - 2+ pointers → cancels any in-flight gesture (no pinch zoom).
 */
export function usePointerGestures(
  hostRef: React.RefObject<HTMLDivElement | null>,
  cb: PointerGestureCallbacks,
): void {
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const pointers = new Map<number, PointerSample>();
    let state: GestureState = null;
    let pendingConnector: ConnectorPending | null = null;
    let pendingConnectorTool: ConnectorTool | null = null;

    const setPending = (next: ConnectorPending | null) => {
      pendingConnector = next;
      pendingConnectorTool = next?.tool ?? null;
      cbRef.current.onConnectorPendingChange?.(next);
    };

    const clearPendingIfToolChanged = () => {
      if (!pendingConnector) return;
      const t = isConnectorTool(cbRef.current.getTool());
      if (t !== pendingConnectorTool) setPending(null);
    };

    const localXY = (e: PointerEvent): PointerSample => {
      const rect = host.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const screenToWorld = (s: PointerSample): Vec2 | null => {
      const cam = cbRef.current.getCamera();
      if (!cam) return null;
      return cam.screenToWorld(s.x, s.y);
    };

    const cancelSingle = () => {
      if (state?.kind === "single" && state.mode === "drag-body") {
        cbRef.current.world.endDrag();
        cbRef.current.onDragStateChange?.(false);
      }
      state = null;
    };

    const onPointerDown = (e: PointerEvent) => {
      // Only the primary mouse button starts a gesture; viewport is locked
      // so middle/right have nothing to do.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const xy = localXY(e);
      pointers.set(e.pointerId, xy);
      host.setPointerCapture?.(e.pointerId);

      if (pointers.size === 1) {
        const world = screenToWorld(xy);
        if (!world) return;
        const tool = cbRef.current.getTool();
        clearPendingIfToolChanged();

        // Connector tools never drag bodies — a press on a body still
        // resolves to a tap that captures it as anchor A or B.
        const connector = isConnectorTool(tool);
        let draggedId: Id | null = null;
        if (connector === null) {
          const potentialId = cbRef.current.world.startDragAt(world, { rotate: e.shiftKey });
          // Check if this body is allowed to be dragged (e.g., in puzzle mode, only player-placed items)
          if (potentialId !== null && cbRef.current.canDragBody?.(potentialId) !== false) {
            draggedId = potentialId;
          } else if (potentialId !== null) {
            // Body was started but can't be dragged - end the drag
            cbRef.current.world.endDrag();
          }
        }
        if (draggedId !== null) {
          cbRef.current.onSelect(draggedId);
          cbRef.current.onDragStateChange?.(true);
          state = {
            kind: "single",
            pointerId: e.pointerId,
            startX: xy.x,
            startY: xy.y,
            lastX: xy.x,
            lastY: xy.y,
            totalMovement: 0,
            mode: "drag-body",
            draggedId,
          };
        } else {
          state = {
            kind: "single",
            pointerId: e.pointerId,
            startX: xy.x,
            startY: xy.y,
            lastX: xy.x,
            lastY: xy.y,
            totalMovement: 0,
            mode: "pending",
            draggedId: null,
          };
        }
      } else {
        // 2+ pointers: viewport is locked, so cancel any single gesture.
        cancelSingle();
      }
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const xy = localXY(e);
      pointers.set(e.pointerId, xy);

      if (state?.kind !== "single" || state.pointerId !== e.pointerId) return;
      const dx = xy.x - state.lastX;
      const dy = xy.y - state.lastY;
      state.totalMovement += Math.hypot(dx, dy);
      state.lastX = xy.x;
      state.lastY = xy.y;

      if (state.mode === "drag-body") {
        const w = screenToWorld(xy);
        if (w) cbRef.current.world.updateDrag(w);
        return;
      }

      // pending: not on a body; only emit connector preview moves so the
      // ghost line follows the finger. Viewport is locked, so we never
      // upgrade to a pan.
      if (pendingConnector) {
        const w = screenToWorld(xy);
        if (w) cbRef.current.onConnectorPreviewMove?.(w);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const xy = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      if (host.hasPointerCapture?.(e.pointerId)) {
        host.releasePointerCapture(e.pointerId);
      }

      if (state?.kind === "single" && state.pointerId === e.pointerId && xy) {
        if (state.mode === "drag-body") {
          // Check if dragging back to tray for removal
          const trayBottom = cbRef.current.getTrayBottom?.();
          if (trayBottom !== undefined && e.clientY >= trayBottom && state.draggedId !== null) {
            // Dragged over tray area - remove it
            cbRef.current.onReturnToTray?.(state.draggedId);
          } else {
            // Normal drag end
            cbRef.current.world.endDrag();
          }
          cbRef.current.onDragStateChange?.(false);
        } else if (
          state.mode === "pending" &&
          state.totalMovement <= TAP_MOVEMENT_THRESHOLD
        ) {
          // Tap. Spawn, place a connector anchor, or deselect.
          const tool = cbRef.current.getTool();
          const w = screenToWorld(xy);
          const connector = isConnectorTool(tool);
          if (connector && w) {
            handleConnectorTap(connector, w);
          } else {
            const spawn = isSpawnTool(tool);
            if (spawn && w) {
              cbRef.current.onSpawn(spawn, w);
            } else if (tool === "select" && w) {
              const bodyTap = cbRef.current.world.bodyAt(w);
              if (bodyTap !== null) cbRef.current.onSelect(bodyTap);
              else cbRef.current.onSelect(cbRef.current.world.constraintAt(w));
            } else {
              cbRef.current.onSelect(null);
            }
          }
        }
        state = null;
      }
    };

    const resolveAnchor = (worldPt: Vec2): ResolvedAnchor => {
      const id = cbRef.current.world.bodyAt(worldPt);
      if (id !== null) return { kind: "body", id, hitPoint: worldPt };
      return { kind: "world", point: worldPt };
    };

    const handlePulleyTap = (worldPt: Vec2) => {
      if (pendingConnector && pendingConnector.tool !== "pulley") {
        setPending(null);
      }
      const anchor = resolveAnchor(worldPt);

      if (!pendingConnector || pendingConnector.tool !== "pulley") {
        if (anchor.kind !== "world") return;
        setPending({
          tool: "pulley",
          stage: "center",
          center: anchor.point,
        });
        return;
      }

      if (pendingConnector.stage === "center") {
        if (!isBodyAnchor(anchor)) return;
        setPending({
          tool: "pulley",
          stage: "bodyA",
          center: pendingConnector.center,
          bodyA: anchor,
        });
        return;
      }

      const pulleyPending = pendingConnector;
      if (pulleyPending.stage !== "bodyA") return;
      if (!isBodyAnchor(anchor)) return;
      if (anchor.id === pulleyPending.bodyA.id) return;
      const center = pulleyPending.center;
      const bodyA = pulleyPending.bodyA;
      setPending(null);
      cbRef.current.onPulleyCommit?.(center, bodyA, anchor);
    };

    const handleConnectorTap = (tool: ConnectorTool, worldPt: Vec2) => {
      if (tool === "pulley") {
        handlePulleyTap(worldPt);
        return;
      }

      // Switching connector tools mid-pending starts fresh.
      if (pendingConnector && pendingConnector.tool !== tool) {
        setPending(null);
      }
      const anchor = resolveAnchor(worldPt);

      if (!pendingConnector) {
        if (tool === "belt") {
          if (!isBodyAnchor(anchor)) return;
          const snap = cbRef.current.world.snapshot();
          const bv = snap.bodies.find((b) => b.id === anchor.id);
          if (!bv || bv.kind !== "engine_rotor") return;
        } else if (!anchorValidForRole(tool, "a", anchor)) return;
        setPending({ tool, a: anchor });
        return;
      }

      if (pendingConnector.tool === "pulley") return;

      if (pendingConnector.tool === "belt") {
        if (!isBodyAnchor(anchor)) return;
        const snap = cbRef.current.world.snapshot();
        const a = pendingConnector.a;
        if (!isBodyAnchor(a)) return;
        if (anchor.id === a.id) return;
        const driverView = snap.bodies.find((b) => b.id === a.id);
        const drivenView = snap.bodies.find((b) => b.id === anchor.id);
        if (!driverView || !drivenView) return;
        if (driverView.kind !== "engine_rotor") return;
        if (drivenView.fixed) return;
        if (drivenView.kind === "engine") return;
        setPending(null);
        cbRef.current.onConnectorCommit?.("belt", a, anchor);
        return;
      }

      if (!anchorValidForRole(tool, "b", anchor)) return;
      const a = pendingConnector.a;
      setPending(null);
      cbRef.current.onConnectorCommit?.(tool, a, anchor);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pendingConnector) {
        setPending(null);
        e.preventDefault();
      }
    };
    const onContextMenu = (e: MouseEvent) => {
      // Right-click cancels a pending connector; only swallow when one
      // is pending so the rest of the canvas keeps the default menu off
      // via existing `touch-action: none` handling.
      if (pendingConnector) {
        setPending(null);
        e.preventDefault();
      }
    };

    const onPointerCancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      cancelSingle();
    };

    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", onPointerUp);
    host.addEventListener("pointercancel", onPointerCancel);
    host.addEventListener("pointerleave", onPointerCancel);
    host.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointercancel", onPointerCancel);
      host.removeEventListener("pointerleave", onPointerCancel);
      host.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
      if (pendingConnector) setPending(null);
    };
  }, [hostRef]);
}
