import { useEffect, useRef, useState } from "react";
import {
  ball,
  balloon,
  bar,
  belt,
  bodyAnchor,
  box,
  crank,
  defaultSceneName,
  engine,
  hinge,
  magnet,
  playbackTimeScale,
  playbackTimeScaleMax,
  playbackTimeScaleMin,
  type SceneName,
  pulley,
  rope,
  spring,
  worldAnchor,
  type Anchor,
  type BodyView,
  type Snapshot,
  type Vec2,
  type World,
} from "../simulation";
import { Renderer } from "../render";
import type { ConnectorPreviewState } from "../render/scene/ConnectorPreviewView";
import { Toolbar } from "./panels/Toolbar";
import { SpawnToolOptions } from "./panels/SpawnToolOptions";
import { ConnectorToolOptions } from "./panels/ConnectorToolOptions";
import { Inspector } from "./panels/Inspector";
import { InspectorPeek } from "./panels/InspectorPeek";
import { PlaybackBar } from "./panels/PlaybackBar";
import { Drawer } from "./components/Drawer";
import {
  CloseIcon,
  FitViewIcon,
  InspectorIcon,
  ToolsIcon,
} from "./icons";
import { useSimulation } from "./hooks/useSimulation";
import { SimulationProvider } from "./hooks/SimulationContext";
import {
  usePointerGestures,
  type ConnectorPending,
  type ResolvedAnchor,
  type SpawnMode,
} from "./canvas/usePointerGestures";
import { useViewportMode } from "./hooks/useViewportMode";
import { useUIStore } from "./state/store";
import { testIds } from "./a11y/ids";
import {
  defaultLevelId,
  evaluateGoal,
  levelById,
  levels,
  type GameMode,
  type GameTool,
  type PaletteItem,
} from "../game";
import { LevelHud } from "../game/ui/LevelHud";
import { ModeToggle } from "../game/ui/ModeToggle";
import { WinScreen } from "../game/ui/WinScreen";
import { PuzzleTray } from "../game/ui/PuzzleTray";

export function App() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const sim = useSimulation(defaultSceneName);
  const mode = useViewportMode();

  // Pending connector state lives in refs so the per-frame loop can read
  // it without retriggering React. UI never mutates physics state from
  // here — the commit handler issues `world.addConstraint` once.
  const pendingConnectorRef = useRef<ConnectorPending | null>(null);
  const previewWorldPointRef = useRef<Vec2 | null>(null);

  const showGrid = useUIStore((s) => s.showGrid);
  const showEField = useUIStore((s) => s.showEField);
  const showBField = useUIStore((s) => s.showBField);
  const hasCharges = useUIStore((s) => s.hasCharges);
  const hasMagnets = useUIStore((s) => s.hasMagnets);
  const setHasCharges = useUIStore((s) => s.setHasCharges);
  const setHasMagnets = useUIStore((s) => s.setHasMagnets);
  const setRunning = useUIStore((s) => s.setRunning);
  const selectedId = useUIStore((s) => s.selectedId);
  const setSelectedId = useUIStore((s) => s.setSelectedId);
  const toolsOpen = useUIStore((s) => s.toolsOpen);
  const inspectorOpen = useUIStore((s) => s.inspectorOpen);
  const setToolsOpen = useUIStore((s) => s.setToolsOpen);
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const setDragging = useUIStore((s) => s.setDragging);
  const scene = useUIStore((s) => s.scene);
  const setScene = useUIStore((s) => s.setScene);
  const gameMode = useUIStore((s) => s.mode);
  const currentLevelId = useUIStore((s) => s.currentLevelId);
  const setMode = useUIStore((s) => s.setMode);
  const setPhase = useUIStore((s) => s.setPhase);
  const setCurrentLevelId = useUIStore((s) => s.setCurrentLevelId);
  const setInventory = useUIStore((s) => s.setInventory);
  const setLevelHandles = useUIStore((s) => s.setLevelHandles);
  const consumeInventory = useUIStore((s) => s.consumeInventory);
  const refundInventory = useUIStore((s) => s.refundInventory);
  const setTool = useUIStore((s) => s.setTool);
  const [airDensity, setAirDensity] = useState(() => sim.world.config.fluidDensity);
  const [timeScale, setTimeScaleState] = useState(playbackTimeScale);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new Renderer();
    rendererRef.current = renderer;

    let raf = 0;
    let cancelled = false;
    let last = performance.now();

    const loop = (now: number) => {
      if (cancelled) return;
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      sim.world.step(dt);
      const snap = sim.world.snapshot();

      // Puzzle-mode goal evaluation. Reading from the store here is
      // intentional — it avoids re-subscribing the loop on every state
      // change.
      const s = useUIStore.getState();
      if (s.mode === "puzzle" && s.phase === "running") {
        const handles = s.levelHandles;
        const lvId = s.currentLevelId;
        const lv = lvId ? levelById[lvId] : null;
        if (handles && lv) {
          const status = evaluateGoal(snap, lv.goal, handles);
          if (status === "won") {
            sim.world.pause();
            s.setRunning(false);
            s.setPhase("won");
          }
        }
      }

      renderer.setConnectorPreview(
        computePreviewState(
          snap,
          pendingConnectorRef.current,
          previewWorldPointRef.current,
          sim.world,
        ),
      );
      renderer.render(snap);
      setHasCharges(snap.charges.length > 0);
      setHasMagnets(snap.magnets.length > 0);
      raf = requestAnimationFrame(loop);
    };

    renderer.attach(host).then(() => {
      if (cancelled) return;
      renderer.setShowGrid(useUIStore.getState().showGrid);
      // Honor any view bounds the initial scene declared; otherwise fit
      // to the bodies it added (empty scenes keep the default framing).
      const initBounds = sim.initialSceneInfo.viewBounds ?? null;
      renderer.setViewBounds(initBounds);
      if (!initBounds) {
        renderer.fitToContent(sim.world.snapshot());
      }
      last = performance.now();
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [sim.world, setHasCharges, setHasMagnets]);

  useEffect(() => {
    rendererRef.current?.setShowGrid(showGrid);
  }, [showGrid]);

  useEffect(() => {
    rendererRef.current?.setShowEField(showEField && hasCharges);
  }, [showEField, hasCharges]);

  useEffect(() => {
    rendererRef.current?.setShowBField(showBField && hasMagnets);
  }, [showBField, hasMagnets]);

  // Drive the on-canvas selection ring directly from the UI store; this
  // is intentionally independent of any drawer/peek state so users
  // always see what's selected.
  useEffect(() => {
    rendererRef.current?.setSelectedId(selectedId);
  }, [selectedId]);

  // Dev-only probe: exposes a tiny imperative surface to Playwright and
  // ad-hoc debugging. Disabled in production builds so it never leaks
  // simulation internals into the public bundle.
  useEffect(() => {
    if (import.meta.env.MODE === "production") return;
    const probe = {
      setSelectedId: (id: number | null) =>
        setSelectedId(id === null ? null : (id as unknown as NonNullable<typeof selectedId>)),
      setDragging,
      fitView: () => rendererRef.current?.fitToContent(sim.world.snapshot()),
      getCameraState: () => {
        const cam = rendererRef.current?.camera;
        return cam ? { center: cam.center, zoom: cam.zoom, canvas: cam.canvasSize } : null;
      },
      getBodies: () => sim.world.snapshot().bodies.map((b) => ({
        id: b.id,
        kind: b.kind,
        position: b.position,
      })),
    };
    (globalThis as unknown as { __pb?: unknown }).__pb = probe;
    return () => {
      const g = globalThis as unknown as { __pb?: unknown };
      if (g.__pb === probe) delete g.__pb;
    };
  }, [setSelectedId, setDragging, sim.world]);

  /** Delete / Backspace removes the selection when focus is outside form controls. */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (useUIStore.getState().dragging) return;
      const t = e.target;
      if (
        t instanceof Element &&
        t.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }
      const id = useUIStore.getState().selectedId;
      if (id === null) return;
      e.preventDefault();
      sim.remove(id);
      refundInventory(id);
      setSelectedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sim, setSelectedId, refundInventory]);

  const loadPuzzleLevel = (id: string) => {
    const level = levelById[id];
    if (!level) return;
    rendererRef.current?.reset();
    sim.world.reset();
    const handles = level.setupScene(sim.world);
    setLevelHandles(handles);
    setInventory({ ...level.palette });
    setCurrentLevelId(id);
    setPhase("design");
    sim.pause();
    setRunning(false);
    setSelectedId(null);
    setTool("select");
    rendererRef.current?.setGoalZones(handles.goalZones);
    setAirDensity(sim.world.config.fluidDensity);
    const bounds = level.viewBounds ?? null;
    rendererRef.current?.setViewBounds(bounds);
    if (!bounds) rendererRef.current?.fitToContent(sim.world.snapshot());
  };

  /** Restart puzzle from design phase, preserving placed items. */
  const restartFromDesign = () => {
    const s = useUIStore.getState();
    const level = s.currentLevelId ? levelById[s.currentLevelId] : null;
    if (!level) return;

    // Save positions of currently placed items
    const snap = sim.world.snapshot();
    const savedPlacements = Object.entries(s.placedItemMeta).map(
      ([idStr, meta]) => {
        const id = Number(idStr);
        const body = snap.bodies.find((b) => b.id === id);
        return {
          tool: meta.tool,
          position: body?.position ?? { x: 0, y: 0 },
          angle: body?.angle ?? 0,
          fixedWhenRunning: meta.fixedWhenRunning,
        };
      }
    );

    // Full scene reset
    rendererRef.current?.reset();
    sim.world.reset();
    const handles = level.setupScene(sim.world);
    setLevelHandles(handles);
    rendererRef.current?.setGoalZones(handles.goalZones);
    s.clearPlacedItemMeta();
    s.clearUndo();

    // Rebuild inventory from palette
    const inv: Partial<Record<GameTool, number>> = {};
    for (const [tool, item] of Object.entries(level.palette)) {
      inv[tool as GameTool] =
        typeof item === "object" && item !== null ? item.count : item;
    }
    setInventory(inv);

    // Re-add saved placed items as dynamic (for design phase)
    for (const saved of savedPlacements) {
      const presets = s.spawnPresets;
      let newId: import("../simulation").Id | null = null;

      if (saved.tool === "ball") {
        const p = presets.ball;
        newId = sim.add(
          ball({
            position: saved.position,
            radius: p.radius,
            material: p.material,
            linearDamping: p.linearDamping,
            angularDamping: p.angularDamping,
            angle: saved.angle,
            fixed: false,
            ...(p.collideDynamicBalls ? {} : { collideWithBalls: false as const }),
          })
        );
      } else if (saved.tool === "ball+") {
        const p = presets.ballPlus;
        newId = sim.add(
          ball({
            position: saved.position,
            radius: p.radius,
            material: p.material,
            linearDamping: p.linearDamping,
            angularDamping: p.angularDamping,
            angle: saved.angle,
            fixed: false,
            charge: p.charge,
            ...(p.collideDynamicBalls ? {} : { collideWithBalls: false as const }),
          })
        );
      } else if (saved.tool === "ball-") {
        const p = presets.ballMinus;
        newId = sim.add(
          ball({
            position: saved.position,
            radius: p.radius,
            material: p.material,
            linearDamping: p.linearDamping,
            angularDamping: p.angularDamping,
            angle: saved.angle,
            fixed: false,
            charge: p.charge,
            ...(p.collideDynamicBalls ? {} : { collideWithBalls: false as const }),
          })
        );
      } else if (saved.tool === "box") {
        const p = presets.box;
        newId = sim.add(
          box({
            position: saved.position,
            width: p.width,
            height: p.height,
            material: p.material,
            linearDamping: p.linearDamping,
            angularDamping: p.angularDamping,
            angle: saved.angle,
            fixed: false,
          })
        );
      } else if (saved.tool === "balloon") {
        const p = presets.balloon;
        newId = sim.add(
          balloon({
            position: saved.position,
            radius: p.radius,
            material: p.material,
            linearDamping: p.linearDamping,
            angularDamping: p.angularDamping,
            angle: saved.angle,
            fixed: false,
            buoyancyLift: p.buoyancyLift,
            ...(p.collideDynamicBalls ? {} : { collideWithBalls: false as const }),
          })
        );
      } else if (saved.tool === "magnet+" || saved.tool === "magnet-") {
        const p =
          saved.tool === "magnet+" ? presets.magnetPlus : presets.magnetMinus;
        const sign = saved.tool === "magnet+" ? 1 : -1;
        newId = sim.add(
          magnet({
            position: saved.position,
            radius: p.radius,
            dipole: sign * p.dipoleMagnitude,
            angle: saved.angle,
            fixed: false,
          })
        );
      } else if (saved.tool === "engine+" || saved.tool === "engine-") {
        const p =
          saved.tool === "engine+" ? presets.enginePlus : presets.engineMinus;
        const sign = saved.tool === "engine+" ? 1 : -1;
        newId = sim.add(
          engine({
            position: saved.position,
            width: p.width,
            height: p.height,
            rotorRadius: p.flywheelRadius,
            rpm: sign * p.rpm,
            maxTorque: p.maxTorque,
            material: p.material,
            linearDamping: p.linearDamping,
            angularDamping: p.angularDamping,
            angle: saved.angle,
            fixed: false,
          })
        );
      } else if (saved.tool === "crank") {
        const p = presets.crank;
        newId = sim.add(
          crank({
            position: saved.position,
            radius: p.radius,
            pinRadius: p.pinRadius,
            material: p.material,
            linearDamping: p.linearDamping,
            angularDamping: p.angularDamping,
            angle: saved.angle,
            fixed: false,
            ...(p.collideDynamicBalls ? {} : { collideWithBalls: false as const }),
          })
        );
      }

      if (newId !== null) {
        const meta = {
          tool: saved.tool,
          fixedWhenRunning: saved.fixedWhenRunning,
          spec: {} as any, // not used for restart
        };
        s.consumeInventory(saved.tool, newId, meta);
      }
    }

    setPhase("design");
    sim.pause();
    setRunning(false);
    setSelectedId(null);
    setAirDensity(sim.world.config.fluidDensity);
    const bounds = level.viewBounds ?? null;
    rendererRef.current?.setViewBounds(bounds);
    if (!bounds) rendererRef.current?.fitToContent(sim.world.snapshot());
  };

  const enterSandboxMode = () => {
    setMode("sandbox");
    setLevelHandles(null);
    setInventory({});
    setCurrentLevelId(null);
    setPhase("design");
    rendererRef.current?.reset();
    rendererRef.current?.setGoalZones([]);
    const info = sim.loadScene(scene);
    sim.resume();
    setRunning(true);
    setSelectedId(null);
    setAirDensity(sim.world.config.fluidDensity);
    const bounds = info.viewBounds ?? null;
    rendererRef.current?.setViewBounds(bounds);
    if (!bounds) rendererRef.current?.fitToContent(sim.world.snapshot());
  };

  const handleModeChange = (next: GameMode) => {
    if (next === gameMode) return;
    if (next === "puzzle") {
      setMode("puzzle");
      loadPuzzleLevel(currentLevelId ?? defaultLevelId);
    } else {
      enterSandboxMode();
    }
  };

  const handleLevelChange = (id: string) => {
    if (gameMode !== "puzzle") return;
    loadPuzzleLevel(id);
  };

  const onPlay = () => {
    const s = useUIStore.getState();
    if (s.mode === "puzzle") {
      if (s.phase === "won" || s.phase === "lost") {
        loadPuzzleLevel(s.currentLevelId ?? defaultLevelId);
        return;
      }
      if (s.phase === "design") {
        // Apply fixed property to player-placed items before running
        for (const [idStr, meta] of Object.entries(s.placedItemMeta)) {
          if (meta.fixedWhenRunning) {
            sim.world.patchBody(Number(idStr), { fixed: true });
          }
        }
        s.setPhase("running");
      }
    }
    sim.resume();
    setRunning(true);
  };
  const onPause = () => {
    sim.pause();
    setRunning(false);
  };
  const onStep = () => {
    sim.stepOnce();
  };
  const onReset = () => {
    const s = useUIStore.getState();
    if (s.mode === "puzzle") {
      restartFromDesign();
      return;
    }
    rendererRef.current?.reset();
    const info = sim.loadScene(s.scene);
    setSelectedId(null);
    setRunning(true);
    setAirDensity(sim.world.config.fluidDensity);
    const bounds = info.viewBounds ?? null;
    rendererRef.current?.setViewBounds(bounds);
    if (!bounds) rendererRef.current?.fitToContent(sim.world.snapshot());
  };

  const onSceneChange = (name: SceneName) => {
    setScene(name);
    if (gameMode === "puzzle") return; // scene picker is hidden in puzzle mode
    rendererRef.current?.reset();
    const info = sim.loadScene(name);
    setSelectedId(null);
    setAirDensity(sim.world.config.fluidDensity);
    const bounds = info.viewBounds ?? null;
    rendererRef.current?.setViewBounds(bounds);
    if (!bounds) rendererRef.current?.fitToContent(sim.world.snapshot());
  };

  const onFitView = () => {
    rendererRef.current?.fitToContent(sim.world.snapshot());
  };

  const handleTrayDrop = (tool: GameTool, clientX: number, clientY: number) => {
    const canvasRect = hostRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    const camera = rendererRef.current?.camera;
    if (!camera) return;
    const screenX = clientX - canvasRect.left;
    const screenY = clientY - canvasRect.top;
    const worldPoint = camera.screenToWorld(screenX, screenY);
    handleSpawn(tool, worldPoint);
  };

  const handleUndo = () => {
    const entry = useUIStore.getState().popUndo();
    if (!entry) return;
    if (entry.kind === "place") {
      sim.remove(entry.id);
      useUIStore.getState().refundInventory(entry.id);
      setSelectedId(null);
    } else if (entry.kind === "remove") {
      // Re-spawn at saved position
      handleSpawn(entry.tool, entry.position);
    }
  };

  const handleReturnToTray = (id: import("../simulation").Id) => {
    sim.remove(id);
    useUIStore.getState().refundInventory(id);
    setSelectedId(null);
  };

  /** Helper: record placement metadata and consume inventory. */
  const recordPlacement = (tool: GameTool, placedId: import("../simulation").Id) => {
    const s = useUIStore.getState();
    if (s.mode !== "puzzle") return;

    // Get fixed-when-running flag from level palette
    const level = s.currentLevelId ? levelById[s.currentLevelId] : null;
    const paletteItem = level?.palette[tool];
    const fixedWhenRunning =
      typeof paletteItem === "object" && paletteItem !== null
        ? paletteItem.fixed ?? false
        : false;

    // Get the spec that was just spawned
    const snap = sim.world.snapshot();
    const body = snap.bodies.find((b) => b.id === placedId);
    if (!body) return;

    // Record meta and consume inventory
    const meta = {
      tool,
      fixedWhenRunning,
      spec: body as unknown as import("../../simulation").AnyBodySpec,
    };
    s.consumeInventory(tool, placedId, meta);
    s.pushUndo({ kind: "place", id: placedId, tool });
  };

  const handleSpawn = (kind: SpawnMode, world: Vec2) => {
    const s = useUIStore.getState();
    // Puzzle-mode inventory gate: reject spawns when the level didn't
    // expose this tool or the count is exhausted. Sandbox is unrestricted.
    if (s.mode === "puzzle") {
      const remaining = s.inventory[kind as GameTool];
      if (remaining === undefined || remaining <= 0) return;
    }
    const presets = s.spawnPresets;
    // In puzzle design phase, always spawn as dynamic (draggable).
    // They'll be converted to static on Play if marked fixed-when-running.
    const inPuzzleDesign = s.mode === "puzzle" && s.phase === "design";
    let placedId: import("../simulation").Id | null = null;
    if (kind === "ball") {
      const p = presets.ball;
      placedId = sim.add(
        ball({
          position: world,
          radius: p.radius,
          material: p.material,
          linearDamping: p.linearDamping,
          angularDamping: p.angularDamping,
          fixed: inPuzzleDesign ? false : p.fixed,
          ...(p.collideDynamicBalls ? {} : { collideWithBalls: false as const }),
        }),
      );
    } else if (kind === "ball+") {
      const p = presets.ballPlus;
      placedId = sim.add(
        ball({
          position: world,
          radius: p.radius,
          material: p.material,
          linearDamping: p.linearDamping,
          angularDamping: p.angularDamping,
          fixed: inPuzzleDesign ? false : p.fixed,
          charge: p.charge,
          ...(p.collideDynamicBalls ? {} : { collideWithBalls: false as const }),
        }),
      );
    } else if (kind === "ball-") {
      const p = presets.ballMinus;
      placedId = sim.add(
        ball({
          position: world,
          radius: p.radius,
          material: p.material,
          linearDamping: p.linearDamping,
          angularDamping: p.angularDamping,
          fixed: inPuzzleDesign ? false : p.fixed,
          charge: p.charge,
          ...(p.collideDynamicBalls ? {} : { collideWithBalls: false as const }),
        }),
      );
    } else if (kind === "balloon") {
      const p = presets.balloon;
      placedId = sim.add(
        balloon({
          position: world,
          radius: p.radius,
          material: p.material,
          linearDamping: p.linearDamping,
          angularDamping: p.angularDamping,
          fixed: inPuzzleDesign ? false : p.fixed,
          buoyancyLift: p.buoyancyLift,
          ...(p.collideDynamicBalls ? {} : { collideWithBalls: false as const }),
        }),
      );
    } else if (kind === "magnet+" || kind === "magnet-") {
      const p = kind === "magnet+" ? presets.magnetPlus : presets.magnetMinus;
      const sign = kind === "magnet+" ? 1 : -1;
      placedId = sim.add(
        magnet({
          position: world,
          radius: p.radius,
          dipole: sign * p.dipoleMagnitude,
          fixed: inPuzzleDesign ? false : p.fixed,
        }),
      );
    } else if (kind === "engine+" || kind === "engine-") {
      const p = kind === "engine+" ? presets.enginePlus : presets.engineMinus;
      const sign = kind === "engine+" ? 1 : -1;
      placedId = sim.add(
        engine({
          position: world,
          width: p.width,
          height: p.height,
          rotorRadius: p.flywheelRadius,
          rpm: sign * p.rpm,
          maxTorque: p.maxTorque,
          material: p.material,
          linearDamping: p.linearDamping,
          angularDamping: p.angularDamping,
          fixed: inPuzzleDesign ? false : p.fixed,
        }),
      );
    } else if (kind === "box") {
      const p = presets.box;
      placedId = sim.add(
        box({
          position: world,
          width: p.width,
          height: p.height,
          material: p.material,
          linearDamping: p.linearDamping,
          angularDamping: p.angularDamping,
          fixed: inPuzzleDesign ? false : p.fixed,
        }),
      );
    } else if (kind === "crank") {
      const p = presets.crank;
      placedId = sim.add(
        crank({
          position: world,
          radius: p.radius,
          pinRadius: p.pinRadius,
          material: p.material,
          linearDamping: p.linearDamping,
          angularDamping: p.angularDamping,
          fixed: inPuzzleDesign ? false : p.fixed,
          ...(p.collideDynamicBalls ? {} : { collideWithBalls: false as const }),
        }),
      );
    }
    if (placedId !== null && s.mode === "puzzle") {
      recordPlacement(kind as GameTool, placedId);
    }
  };

  const handleConnectorCommit = (
    tool: "rope" | "hinge" | "spring" | "belt" | "bar",
    a: ResolvedAnchor,
    b: ResolvedAnchor,
  ) => {
    const s = useUIStore.getState();
    if (s.mode === "puzzle") {
      const remaining = s.inventory[tool as GameTool];
      if (remaining === undefined || remaining <= 0) return;
    }
    const presets = s.connectorPresets;
    const snapCommit = sim.world.snapshot();
    let constraintId: import("../simulation").Id | null = null;
    if (tool === "belt") {
      if (a.kind !== "body" || b.kind !== "body") return;
      if (a.id === b.id) return;
      const snap = sim.world.snapshot();
      const da = snap.bodies.find((x) => x.id === a.id);
      const db = snap.bodies.find((x) => x.id === b.id);
      if (!da || !db || da.kind !== "engine_rotor" || db.fixed) return;
      if (db.kind === "engine") return;
      constraintId = sim.world.addConstraint(
        belt({ driverRotorId: a.id, drivenBodyId: b.id }),
      );
    } else if (tool === "rope") {
      const pr = presets.rope;
      const length = anchorDistance(snapCommit, a, b);
      if (length < 0.05) return;
      constraintId = sim.world.addConstraint(
        rope({
          a: toAnchor(a, snapCommit),
          b: toAnchor(b, snapCommit),
          length,
          material: pr.material,
          segments: pr.segments,
        }),
      );
    } else if (tool === "spring") {
      const ps = presets.spring;
      const restLength = anchorDistance(snapCommit, a, b);
      if (restLength < 0.05) return;
      constraintId = sim.world.addConstraint(
        spring({
          a: toAnchor(a, snapCommit),
          b: toAnchor(b, snapCommit),
          restLength,
          frequencyHz: ps.frequencyHz,
          dampingRatio: ps.dampingRatio,
        }),
      );
    } else if (tool === "hinge") {
      // Anchor A is enforced by the gesture to be a body. The hinge
      // pivot is placed at click 2 in world space; if click 2 also
      // hits a body, the hinge becomes a body-to-body revolute.
      if (a.kind !== "body") return;
      constraintId = sim.world.addConstraint(
        hinge({
          bodyA: a.id,
          bodyB: b.kind === "body" ? b.id : undefined,
          worldAnchor: b.kind === "body" ? b.hitPoint : b.point,
        }),
      );
    } else if (tool === "bar") {
      const length = anchorDistance(snapCommit, a, b);
      if (length < 0.05) return;
      constraintId = sim.world.addConstraint(
        bar({
          a: toAnchor(a, snapCommit),
          b: toAnchor(b, snapCommit),
          length,
        }),
      );
    }
    if (constraintId !== null && s.mode === "puzzle") {
      consumeInventory(tool as GameTool, constraintId);
    }
  };

  const handlePulleyCommit = (
    center: Vec2,
    bodyA: ResolvedAnchor,
    bodyB: ResolvedAnchor,
  ) => {
    if (bodyA.kind !== "body" || bodyB.kind !== "body") return;
    if (bodyA.id === bodyB.id) return;
    const snap = sim.world.snapshot();
    const ba = snap.bodies.find((b) => b.id === bodyA.id);
    const bb = snap.bodies.find((b) => b.id === bodyB.id);
    if (!ba || !bb || ba.fixed || bb.fixed) return;
    const s = useUIStore.getState();
    if (s.mode === "puzzle") {
      const remaining = s.inventory.pulley;
      if (remaining === undefined || remaining <= 0) return;
    }
    const pp = s.connectorPresets.pulley;
    const constraintId = sim.world.addConstraint(
      pulley({
        wheelCenter: center,
        bodyA: bodyA.id,
        bodyB: bodyB.id,
        localAnchorA: hitWorldToBodyLocal(ba, bodyA.hitPoint),
        localAnchorB: hitWorldToBodyLocal(bb, bodyB.hitPoint),
        halfSpread: pp.halfSpread,
        ratio: pp.ratio,
      }),
    );
    if (s.mode === "puzzle") consumeInventory("pulley", constraintId);
  };

  const handleConnectorPendingChange = (pending: ConnectorPending | null) => {
    pendingConnectorRef.current = pending;
    if (pending === null) previewWorldPointRef.current = null;
  };

  const handleConnectorPreviewMove = (worldPt: Vec2) => {
    previewWorldPointRef.current = worldPt;
  };

  usePointerGestures(hostRef, {
    world: sim.world,
    getCamera: () => rendererRef.current?.camera ?? null,
    getTool: () => useUIStore.getState().tool,
    onSpawn: handleSpawn,
    onSelect: setSelectedId,
    onDragStateChange: setDragging,
    onConnectorCommit: handleConnectorCommit,
    onPulleyCommit: handlePulleyCommit,
    onConnectorPendingChange: handleConnectorPendingChange,
    onConnectorPreviewMove: handleConnectorPreviewMove,
    onReturnToTray: gameMode === "puzzle" ? handleReturnToTray : undefined,
    getTrayBottom:
      gameMode === "puzzle"
        ? () => {
            const stage = document.querySelector('[style*="position: relative"]');
            if (!stage) return window.innerHeight - 120;
            const rect = stage.getBoundingClientRect();
            return rect.bottom - 68;
          }
        : undefined,
  });

  const isPhone = mode === "phone";
  const isTablet = mode === "tablet";
  const isDesktop = mode === "desktop";

  // Tablet shares the phone-style inspector UX (floating peek, drawer
  // accessed via a FAB). Only desktop keeps a permanent inspector
  // panel — at iPad-landscape widths the panel was just stealing
  // canvas width to render "No body selected".
  const inspectorAsDrawer = !isDesktop;

  return (
    <SimulationProvider value={sim}>
      <div data-testid={testIds.app} style={appShell}>
        <div style={mainRow}>
          {/* Toolbar: rail on tablet, full panel on desktop, drawer on phone. Hidden in puzzle mode. */}
          {gameMode !== "puzzle" && isTablet && <Toolbar variant="rail" />}
          {gameMode !== "puzzle" && isDesktop && <Toolbar variant="panel" />}

          <main style={canvasColumn}>
            {/* Tool option panels dock under the toolbar on tablet/desktop
                so they sit out of the way; on phone we move them BELOW the
                canvas (above the playback bar) so they don't fight the
                LevelHud / FABs at the top edge and they land near the
                user's thumb. Hidden in puzzle mode. */}
            {gameMode !== "puzzle" && !isPhone && <SpawnToolOptions />}
            {gameMode !== "puzzle" && !isPhone && <ConnectorToolOptions />}
            <div style={canvasStage}>
            <div
              ref={hostRef}
              data-testid={testIds.canvasHost}
              aria-label="Physics Box simulation canvas"
              style={canvasHostStyle}
            />

            {gameMode === "puzzle" && (
              <PuzzleTray
                onDrop={handleTrayDrop}
                getTrayBottom={() => {
                  const stage = document.querySelector('[style*="position: relative"]');
                  if (!stage) return window.innerHeight - 120;
                  const rect = stage.getBoundingClientRect();
                  return rect.bottom - 68;
                }}
              />
            )}

            <button
              type="button"
              aria-label="Fit scene to view"
              title="Fit view"
              data-testid={testIds.buttonFitView}
              onClick={onFitView}
              style={{
                ...fitButtonStyle,
                width: isPhone ? 44 : 36,
                height: isPhone ? 44 : 36,
                borderRadius: isPhone ? 22 : 18,
              }}
            >
              <FitViewIcon />
            </button>

            {gameMode !== "puzzle" && isPhone && (
              <button
                type="button"
                aria-label="Open tools"
                data-testid={testIds.fabTools}
                onClick={() => setToolsOpen(true)}
                style={{ ...fabStyle, left: 12 }}
              >
                <ToolsIcon />
              </button>
            )}

            {gameMode !== "puzzle" && inspectorAsDrawer && (
              <button
                type="button"
                aria-label="Open inspector"
                data-testid={testIds.fabInspector}
                onClick={() => setInspectorOpen(true)}
                style={{ ...fabStyle, right: 12 }}
              >
                <InspectorIcon />
              </button>
            )}

            {isPhone && (
              <Drawer
                open={toolsOpen}
                side="left"
                onDismiss={() => setToolsOpen(false)}
                ariaLabel="Tools panel"
                testId={testIds.drawerTools}
                size={Math.min(320, Math.round(typeof window !== "undefined" ? window.innerWidth * 0.78 : 280))}
              >
                <DrawerHeader title="Tools" onClose={() => setToolsOpen(false)} />
                <Toolbar variant="sheet" />
              </Drawer>
            )}
            {inspectorAsDrawer && (
              <Drawer
                open={inspectorOpen}
                side="bottom"
                onDismiss={() => setInspectorOpen(false)}
                ariaLabel="Inspector panel"
                testId={testIds.drawerInspector}
                size={420}
              >
                <DrawerHeader
                  title="Inspector"
                  onClose={() => setInspectorOpen(false)}
                />
                <Inspector variant="sheet" />
              </Drawer>
            )}
            </div>
            {gameMode !== "puzzle" && isPhone && <SpawnToolOptions dock="bottom" />}
            {gameMode !== "puzzle" && isPhone && <ConnectorToolOptions dock="bottom" />}
          </main>

          {gameMode !== "puzzle" && isDesktop && <Inspector variant="panel" />}
        </div>
        {gameMode !== "puzzle" && inspectorAsDrawer && <InspectorPeek />}
        <LevelHud onUndo={gameMode === "puzzle" ? handleUndo : undefined} />
        <WinScreen
          onReplay={() => loadPuzzleLevel(currentLevelId ?? defaultLevelId)}
        />
        <PlaybackBar
          tick={sim.tick}
          compact={isPhone}
          scene={scene}
          gravityEnabled={sim.gravityEnabled}
          airDensity={airDensity}
          maxAirDensity={sim.world.config.maxFluidDensity}
          timeScale={timeScale}
          timeScaleMin={playbackTimeScaleMin}
          timeScaleMax={playbackTimeScaleMax}
          onSceneChange={onSceneChange}
          onGravityChange={sim.setGravityEnabled}
          onAirDensityChange={(v) => {
            sim.world.setFluidDensity(v);
            setAirDensity(v);
          }}
          onTimeScaleChange={(v) => {
            sim.setTimeScale(v);
            setTimeScaleState(sim.world.config.timeScale);
          }}
          onPlay={onPlay}
          onPause={onPause}
          onStep={onStep}
          onReset={onReset}
          mode={gameMode}
          modeToggle={
            <ModeToggle
              mode={gameMode}
              onChange={handleModeChange}
              compact={isPhone}
            />
          }
          puzzlePicker={
            <select
              data-testid="level-select"
              aria-label="Level"
              title="Level"
              value={currentLevelId ?? defaultLevelId}
              onChange={(e) => handleLevelChange(e.target.value)}
              style={{
                appearance: "none",
                border: "1px solid #d8cfbe",
                background: "#f5efe6",
                color: "#2a2520",
                padding: isPhone ? "0 10px" : "3px 8px",
                borderRadius: isPhone ? 6 : 3,
                font: "inherit",
                // ≥16px on phone so iOS Safari does not auto-zoom on focus.
                fontSize: isPhone ? 16 : 12,
                height: isPhone ? 36 : undefined,
                cursor: "pointer",
                minWidth: isPhone ? 92 : 108,
                // Picker can hold the full level title — but stop it from
                // ballooning past row 1 width.
                maxWidth: isPhone ? "60%" : undefined,
                textOverflow: "ellipsis",
              }}
            >
              {levels.map((lv) => (
                <option key={lv.id} value={lv.id}>
                  {lv.title}
                </option>
              ))}
            </select>
          }
        />
      </div>
    </SimulationProvider>
  );
}

function toAnchor(a: ResolvedAnchor, snap: Snapshot): Anchor {
  if (a.kind === "body") {
    const b = snap.bodies.find((x) => x.id === a.id);
    if (!b) return bodyAnchor(a.id);
    const local = hitWorldToBodyLocal(b, a.hitPoint);
    return bodyAnchor(a.id, local);
  }
  return worldAnchor(a.point);
}

function resolveAnchorPosition(
  snap: Snapshot,
  a: ResolvedAnchor,
): Vec2 | null {
  if (a.kind === "world") return a.point;
  if (!snap.bodies.some((b) => b.id === a.id)) return null;
  return a.hitPoint;
}

function hitWorldToBodyLocal(body: BodyView, hitWorld: Vec2): Vec2 {
  const dx = hitWorld.x - body.position.x;
  const dy = hitWorld.y - body.position.y;
  const c = Math.cos(body.angle);
  const s = Math.sin(body.angle);
  return {
    x: dx * c + dy * s,
    y: -dx * s + dy * c,
  };
}

function anchorDistance(
  snap: Snapshot,
  a: ResolvedAnchor,
  b: ResolvedAnchor,
): number {
  const pa = resolveAnchorPosition(snap, a);
  const pb = resolveAnchorPosition(snap, b);
  if (!pa || !pb) return 0;
  return Math.hypot(pb.x - pa.x, pb.y - pa.y);
}

function computePreviewState(
  snap: Snapshot,
  pending: ConnectorPending | null,
  cursor: Vec2 | null,
  world: World,
): ConnectorPreviewState | null {
  if (!pending) return null;

  if (pending.tool === "pulley") {
    const snapping = cursor !== null && world.bodyAt(cursor) !== null;
    if (pending.stage === "center") {
      const c = pending.center;
      const cur = cursor ?? c;
      return {
        kind: "pulley-center",
        center: c,
        cursor: cur,
        snapping,
      };
    }
    const pa = resolveAnchorPosition(snap, pending.bodyA);
    if (!pa) return null;
    const cur = cursor ?? pa;
    return {
      kind: "pulley-body-a",
      center: pending.center,
      anchorA: pa,
      cursor: cur,
      snapping,
    };
  }

  const pa = resolveAnchorPosition(snap, pending.a);
  if (!pa) return null;
  const pb = cursor ?? pa;
  const snapping =
    pending.tool === "rope" ||
    pending.tool === "spring" ||
    pending.tool === "belt"
      ? cursor !== null && world.bodyAt(cursor) !== null
      : undefined;
  return { kind: pending.tool, a: pa, b: pb, snapping };
}

function DrawerHeader(props: { title: string; onClose: () => void }) {
  return (
    <div style={drawerHeaderStyle}>
      <span style={drawerTitleStyle}>{props.title}</span>
      <button
        type="button"
        aria-label="Close"
        onClick={props.onClose}
        style={drawerCloseStyle}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

const appShell: React.CSSProperties = {
  height: "100%",
  width: "100%",
  display: "flex",
  flexDirection: "column",
  background: "#f5efe6",
  color: "#2a2520",
  paddingTop: "env(safe-area-inset-top)",
};

const mainRow: React.CSSProperties = {
  flex: 1,
  display: "flex",
  minHeight: 0,
  minWidth: 0,
};

const canvasColumn: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  position: "relative",
  background: "#f5efe6",
  minWidth: 0,
  minHeight: 0,
};

const canvasStage: React.CSSProperties = {
  flex: 1,
  position: "relative",
  overflow: "hidden",
  minHeight: 0,
};

const canvasHostStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  touchAction: "none",
  userSelect: "none",
  WebkitUserSelect: "none",
};

const fabStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(12px + env(safe-area-inset-top))",
  width: 44,
  height: 44,
  borderRadius: 22,
  border: "1px solid #d8cfbe",
  background: "#f5efe6",
  color: "#2a2520",
  boxShadow: "0 2px 12px rgba(42,37,32,0.18)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  zIndex: 15,
};

const fitButtonStyle: React.CSSProperties = {
  position: "absolute",
  right: 12,
  bottom: 12,
  border: "1px solid #d8cfbe",
  background: "#f5efe6",
  color: "#2a2520",
  boxShadow: "0 2px 10px rgba(42,37,32,0.14)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  zIndex: 14,
};

const drawerHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  borderBottom: "1px solid #d8cfbe",
};

const drawerTitleStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "#5a4f43",
  fontWeight: 600,
};

const drawerCloseStyle: React.CSSProperties = {
  appearance: "none",
  border: "none",
  background: "transparent",
  color: "#5a4f43",
  cursor: "pointer",
  width: 32,
  height: 32,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 16,
};
