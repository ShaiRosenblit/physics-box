import type { World } from "../core/World";
import { empty } from "./empty";
import { welcome } from "./welcome";

export type SceneFn = (world: World) => void;
export type SceneName = "empty" | "welcome";

export const scenes: Readonly<Record<SceneName, SceneFn>> = {
  empty,
  welcome,
};

export { empty, welcome };

export const defaultSceneName: SceneName = "welcome";
