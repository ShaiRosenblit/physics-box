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
  ChargedSourceView,
  ConstraintKind,
  ConstraintSpec,
  ConstraintView,
  HingeSpec,
  Id,
  MagnetSpec,
  MagnetView,
  MagneticSourceView,
  MaterialName,
  RopeSpec,
  RopeView,
  HingeView,
  SpringSpec,
  SpringView,
  Snapshot,
  Vec2,
} from "./core/types";

export {
  ball,
  box,
  magnet,
  rope,
  hinge,
  spring,
  materials,
  worldAnchor,
  bodyAnchor,
} from "./mechanics";

export { ChargeRegistry } from "./electromagnetism/ChargeRegistry";
export { computeCoulombForces, type ChargedBodyState } from "./electromagnetism/coulomb";
export { sampleE } from "./electromagnetism/field";
export { emConstants, type EmConstants } from "./electromagnetism/constants";
export type {
  BallInput,
  BoxInput,
  MagnetInput,
  RopeInput,
  HingeInput,
  SpringInput,
  MaterialProps,
} from "./mechanics";

export { scenes, defaultSceneName, empty, welcome } from "./scenes";
export type { SceneFn, SceneName } from "./scenes";
