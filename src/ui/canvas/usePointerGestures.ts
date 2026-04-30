import { useEffect, useRef } from "react";
import type { Camera } from "../../render";
import type { Id, Vec2, World } from "../../simulation";

export type SpawnMode = "ball" | "box" | "ball+" | "ball-" | "magnet+" | "magnet-";
export type ConnectorTool = "rope" | "hinge" | "spring" | "pulley";

export type ConnectorPending =
  | {
      readonly tool: "rope" | "spring" | "hinge";
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
  /** Active camera; required for screen↔world conversion and pan/zoom. */
  readonly getCamera: () => Camera | null;
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
  /** Optional: notified when the camera changes so the renderer can refresh. */
  readonly onCameraChange?: () => void;
  /** Optional zoom clamps. */
  readonly minZoom?: number;
  readonly maxZoom?: number;
}

function isConnectorTool(tool: string): ConnectorTool | null {
  if (
    tool === "rope" ||
    tool === "hinge" ||
    tool === "spring" ||
    tool === "pulley"
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
  if (tool === "hinge" && role === "a" && anchor.kind !== "body") return false;
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
  /** Current resolved mode: starts as "pending", upgrades on movement or commit. */
  mode: "pending" | "drag-body" | "pan-camera";
  draggedId: Id | null;
  panStartCenter: Vec2;
}

interface PinchState {
  kind: "pinch";
  ids: [number, number];
  startDist: number;
  startMid: PointerSample;
  startZoom: number;
  startCenter: Vec2;
}

type GestureState = SingleState | PinchState | null;

function isSpawnTool(tool: string): SpawnMode | null {
  if (
    tool === "ball" ||
    tool === "box" ||
    tool === "ball+" ||
    tool === "ball-" ||
    tool === "magnet+" ||
    tool === "magnet-"
  ) {
    return tool;
  }
  return null;
}

/**
 * Centralized pointer-gesture handler for the canvas host.
 *
 * Owns multi-pointer state and emits semantic intents:
 *   - 1 pointer on a body → drag the body via the kernel mouse joint.
 *   - 1 pointer on empty space → pan the camera (or spawn on tap).
 *   - 2 pointers → pinch zoom + pan around the gesture midpoint.
 *
 * Mouse wheel + middle/right drag are handled separately by
 * `CameraController` so desktop and touch don't fight for events.
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

    const distance = (a: PointerSample, b: PointerSample): number =>
      Math.hypot(a.x - b.x, a.y - b.y);

    const midpoint = (a: PointerSample, b: PointerSample): PointerSample => ({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    });

    const cancelSingle = () => {
      if (state?.kind === "single") {
        if (state.mode === "drag-body") {
          cbRef.current.world.endDrag();
          cbRef.current.onDragStateChange?.(false);
        }
      }
      state = null;
    };

    const beginPinch = () => {
      const [ida, idb] = Array.from(pointers.keys()).slice(0, 2) as [number, number];
      const a = pointers.get(ida)!;
      const b = pointers.get(idb)!;
      const cam = cbRef.current.getCamera();
      if (!cam) return;
      // If we were dragging or panning with one finger, end that gesture.
      if (state?.kind === "single" && state.mode === "drag-body") {
        cbRef.current.world.endDrag();
        cbRef.current.onDragStateChange?.(false);
      }
      state = {
        kind: "pinch",
        ids: [ida, idb],
        startDist: distance(a, b),
        startMid: midpoint(a, b),
        startZoom: cam.zoom,
        startCenter: { ...cam.center },
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      // Mouse middle/right buttons are owned by CameraController.
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
        const draggedId =
          connector === null ? cbRef.current.world.startDragAt(world) : null;
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
            panStartCenter: { x: 0, y: 0 },
          };
        } else {
          const cam = cbRef.current.getCamera();
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
            panStartCenter: cam ? { ...cam.center } : { x: 0, y: 0 },
          };
        }
      } else if (pointers.size === 2) {
        beginPinch();
      } else {
        // 3+ pointers: ignore extra, but still cancel single gesture.
        cancelSingle();
      }
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const xy = localXY(e);
      pointers.set(e.pointerId, xy);

      if (state?.kind === "pinch") {
        const a = pointers.get(state.ids[0])!;
        const b = pointers.get(state.ids[1])!;
        const cam = cbRef.current.getCamera();
        if (!cam) return;
        const curDist = distance(a, b);
        const curMid = midpoint(a, b);
        const minZoom = cbRef.current.minZoom ?? 8;
        const maxZoom = cbRef.current.maxZoom ?? 240;
        const factor = curDist / Math.max(state.startDist, 1);
        const nextZoom = Math.max(minZoom, Math.min(maxZoom, state.startZoom * factor));
        cam.setZoom(nextZoom);

        // Pan: keep the world point under the start midpoint anchored to
        // the current midpoint as the gesture moves.
        const worldAtStartMid = {
          x: state.startCenter.x + (state.startMid.x - host.clientWidth / 2) / state.startZoom,
          y: state.startCenter.y - (state.startMid.y - host.clientHeight / 2) / state.startZoom,
        };
        cam.setCenter({
          x: worldAtStartMid.x - (curMid.x - host.clientWidth / 2) / nextZoom,
          y: worldAtStartMid.y + (curMid.y - host.clientHeight / 2) / nextZoom,
        });
        cbRef.current.onCameraChange?.();
        return;
      }

      if (state?.kind === "single" && state.pointerId === e.pointerId) {
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

        if (state.mode === "pending") {
          // Live preview for the connector being placed: emit the
          // current world point so the renderer can redraw the ghost
          // line from anchor A to the cursor.
          if (pendingConnector) {
            const w = screenToWorld(xy);
            if (w) cbRef.current.onConnectorPreviewMove?.(w);
          }
          if (state.totalMovement > TAP_MOVEMENT_THRESHOLD) {
            // Upgrade to camera pan.
            state.mode = "pan-camera";
          } else {
            return;
          }
        }

        if (state.mode === "pan-camera") {
          const cam = cbRef.current.getCamera();
          if (!cam) return;
          const totalDx = xy.x - state.startX;
          const totalDy = xy.y - state.startY;
          const z = cam.zoom;
          cam.setCenter({
            x: state.panStartCenter.x - totalDx / z,
            y: state.panStartCenter.y + totalDy / z,
          });
          cbRef.current.onCameraChange?.();
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const xy = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      if (host.hasPointerCapture?.(e.pointerId)) {
        host.releasePointerCapture(e.pointerId);
      }

      if (state?.kind === "pinch") {
        if (pointers.size < 2) {
          // Pinch ended; if one pointer remains, just drop into idle.
          state = null;
        }
        return;
      }

      if (state?.kind === "single" && state.pointerId === e.pointerId && xy) {
        if (state.mode === "drag-body") {
          cbRef.current.world.endDrag();
          cbRef.current.onDragStateChange?.(false);
        } else if (state.mode === "pending") {
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
        if (!anchorValidForRole(tool, "a", anchor)) return;
        setPending({ tool, a: anchor });
        return;
      }

      if (pendingConnector.tool === "pulley") return;

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
