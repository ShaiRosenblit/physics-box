export { World } from "./core/World";
export { defaultConfig, type SimulationConfig } from "./core/config";
export type {
  EventName,
  Listener,
  Unsubscribe,
  KernelEvents,
} from "./core/events";
export type {
  BodyKind,
  BodySpec,
  BallSpec,
  BoxSpec,
  BodyView,
  BallView,
  BoxView,
  Id,
  MaterialName,
  Snapshot,
  Vec2,
} from "./core/types";

export { ball, box, materials } from "./mechanics";
export type { BallInput, BoxInput, MaterialProps } from "./mechanics";
