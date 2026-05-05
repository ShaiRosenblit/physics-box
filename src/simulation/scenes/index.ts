import type { World } from "../core/World";
import { catapult } from "./catapult";
import { doublePendulum } from "./doublePendulum";
import { empty } from "./empty";
import { engines } from "./engines";
import { galton } from "./galton";
import { newtonsCradle } from "./newtonsCradle";
import { random } from "./random";
import { welcome } from "./welcome";

/**
 * Optional metadata a scene may return. When `viewBounds` is set the
 * camera is locked to that world-space rectangle for the lifetime of
 * the scene; otherwise the renderer falls back to fit-to-content.
 */
export interface SceneInfo {
  readonly viewBounds?: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
}

export type SceneFn = (world: World) => SceneInfo | void;
export type SceneName =
  | "empty"
  | "welcome"
  | "engines"
  | "catapult"
  | "galton"
  | "doublePendulum"
  | "newtonsCradle"
  | "random";

export const scenes: Readonly<Record<SceneName, SceneFn>> = {
  empty,
  welcome,
  engines,
  catapult,
  galton,
  doublePendulum,
  newtonsCradle,
  random,
};

export {
  catapult,
  doublePendulum,
  empty,
  engines,
  galton,
  newtonsCradle,
  random,
  welcome,
};

/** Default sandbox load-out: blank canvas until the user builds or picks a preset. */
export const defaultSceneName: SceneName = "empty";

/** Stable order for scene menus (avoid relying on object key enumeration). */
export const sceneIds: readonly SceneName[] = [
  "empty",
  "welcome",
  "engines",
  "catapult",
  "galton",
  "doublePendulum",
  "newtonsCradle",
  "random",
];
