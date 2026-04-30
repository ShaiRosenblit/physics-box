export { World } from "./core/World";
export { defaultConfig, type SimulationConfig } from "./core/config";
export type {
  EventName,
  Listener,
  Unsubscribe,
  KernelEvents,
} from "./core/events";
export type {
  Anchor,
  BodyKind,
  BodySpec,
  BallSpec,
  BoxSpec,
  BodyView,
  BallView,
  BoxView,
  ConstraintKind,
  ConstraintSpec,
  ConstraintView,
  HingeSpec,
  Id,
  MaterialName,
  RopeSpec,
  RopeView,
  HingeView,
  SpringSpec,
  SpringView,
  Snapshot,
  Vec2,
} from "./core/types";

export { ball, box, rope, materials, worldAnchor, bodyAnchor } from "./mechanics";
export type { BallInput, BoxInput, RopeInput, MaterialProps } from "./mechanics";

export { scenes, defaultSceneName, empty, welcome } from "./scenes";
export type { SceneFn, SceneName } from "./scenes";
