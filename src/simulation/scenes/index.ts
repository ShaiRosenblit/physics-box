import type { World } from "../core/World";
import { doublePendulum } from "./doublePendulum";
import { empty } from "./empty";
import { engines } from "./engines";
import { galton } from "./galton";
import { newtonsCradle } from "./newtonsCradle";
import { random } from "./random";
import { welcome } from "./welcome";

export type SceneFn = (world: World) => void;
export type SceneName =
  | "empty"
  | "welcome"
  | "engines"
  | "galton"
  | "doublePendulum"
  | "newtonsCradle"
  | "random";

export const scenes: Readonly<Record<SceneName, SceneFn>> = {
  empty,
  welcome,
  engines,
  galton,
  doublePendulum,
  newtonsCradle,
  random,
};

export {
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
  "galton",
  "doublePendulum",
  "newtonsCradle",
  "random",
];
