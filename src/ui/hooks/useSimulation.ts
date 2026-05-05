import { useCallback, useEffect, useRef, useState } from "react";
import {
  World,
  scenes,
  defaultConfig,
  playbackTimeScale,
  type BodyPatch,
  type BodySpec,
  type ConstraintPatch,
  type Id,
  type SceneInfo,
  type SceneName,
} from "../../simulation";

export interface SimulationApi {
  /** The owned World instance. Reference is stable across renders. */
  readonly world: World;
  /** Metadata returned by the scene that was loaded on construction. */
  readonly initialSceneInfo: SceneInfo;
  /** Latest tick observed by the hook. */
  readonly tick: number;
  /** Whether Planck world gravity uses the configured vector (otherwise zero). */
  readonly gravityEnabled: boolean;
  /** Add a body. Returns its id. */
  add(spec: BodySpec): Id;
  remove(id: Id): void;
  pause(): void;
  resume(): void;
  /** Advance one fixed substep regardless of pause state. */
  stepOnce(): void;
  /**
   * Reset the kernel and apply the named scene. Returns whatever metadata
   * the scene declared (e.g. `viewBounds`); `{}` if it returned nothing.
   */
  loadScene(name: SceneName): SceneInfo;
  setGravityEnabled(enabled: boolean): void;
  /** Clamp to `playbackTimeScaleMin`…`playbackTimeScaleMax`; persists across scene load. */
  setTimeScale(multiplier: number): void;
  /** Update body parameters without changing pose or velocities. */
  patchBody(id: Id, patch: BodyPatch): void;
  /** Sparse constraint update (rope length / spring stiffness / hinge pivot …). */
  patchConstraint(id: Id, patch: ConstraintPatch): void;
}

/**
 * Owns a single World instance for the lifetime of the host component.
 * Exposes commands and an externally observable tick state. Renderer
 * binding is intentionally separate (see App.tsx) so this hook stays
 * usable in headless contexts (e.g. tests).
 */
export function useSimulation(initialScene: SceneName): SimulationApi {
  const worldRef = useRef<World | null>(null);
  const initialInfoRef = useRef<SceneInfo>({});
  if (worldRef.current === null) {
    const w = new World({ ...defaultConfig, timeScale: playbackTimeScale });
    initialInfoRef.current = scenes[initialScene](w) ?? {};
    worldRef.current = w;
  }
  const world = worldRef.current;

  const [tick, setTick] = useState(0);
  const [gravityEnabled, setGravityEnabledState] = useState(true);

  useEffect(() => {
    const unsubStep = world.on("step", ({ tick: t }) => setTick(t));
    return () => {
      unsubStep();
    };
  }, [world]);

  const add = useCallback((spec: BodySpec) => world.add(spec), [world]);
  const remove = useCallback((id: Id) => world.remove(id), [world]);
  const pause = useCallback(() => world.pause(), [world]);
  const resume = useCallback(() => world.resume(), [world]);
  const stepOnce = useCallback(() => {
    world.stepOnce();
    setTick(world.tick);
  }, [world]);
  const loadScene = useCallback(
    (name: SceneName): SceneInfo => {
      world.reset();
      const info = scenes[name](world) ?? {};
      setTick(0);
      return info;
    },
    [world],
  );

  const setGravityEnabled = useCallback(
    (enabled: boolean) => {
      world.setGravityEnabled(enabled);
      setGravityEnabledState(enabled);
    },
    [world],
  );

  const patchBody = useCallback(
    (id: Id, patch: BodyPatch) => {
      world.patchBody(id, patch);
    },
    [world],
  );

  const patchConstraint = useCallback(
    (id: Id, patch: ConstraintPatch) => {
      world.patchConstraint(id, patch);
    },
    [world],
  );

  const setTimeScale = useCallback(
    (multiplier: number) => {
      world.setTimeScale(multiplier);
    },
    [world],
  );

  return {
    world,
    initialSceneInfo: initialInfoRef.current,
    tick,
    gravityEnabled,
    add,
    remove,
    pause,
    resume,
    stepOnce,
    loadScene,
    setGravityEnabled,
    setTimeScale,
    patchBody,
    patchConstraint,
  };
}
