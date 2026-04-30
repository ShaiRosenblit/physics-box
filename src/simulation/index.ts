export { World } from "./core/World";
export {
  defaultConfig,
  playbackTimeScale,
  playbackTimeScaleMax,
  playbackTimeScaleMin,
  type SimulationConfig,
} from "./core/config";
export type {
  EventName,
  Listener,
  Unsubscribe,
  KernelEvents,
} from "./core/events";
export type {
  Anchor,
  BeltSpec,
  BodyKind,
  BodyPatch,
  BodySpec,
  BallSpec,
  BoxSpec,
  BodyView,
  BallView,
  BalloonSpec,
  BalloonView,
  BoxView,
  BeltView,
  EngineSpec,
  EngineHousingView,
  EngineRotorSpec,
  EngineRotorView,
  ChargedSourceView,
  ConstraintKind,
  ConstraintPatch,
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
  PulleySpec,
  PulleyView,
  Snapshot,
  Vec2,
} from "./core/types";

export {
  ball,
  balloon,
  box,
  engine,
  magnet,
  rope,
  hinge,
  spring,
  pulley,
  belt,
  PULLEY_DEFAULT_HALF_SPREAD,
  materials,
  worldAnchor,
  bodyAnchor,
} from "./mechanics";

export { ChargeRegistry } from "./electromagnetism/ChargeRegistry";
export { computeCoulombForces, type ChargedBodyState } from "./electromagnetism/coulomb";
export { sampleE } from "./electromagnetism/field";
export {
  sampleB,
  sampleGradB,
  dipoleMomentXY,
  bFieldFromOffset,
  magneticFieldAt,
  type MagneticBodyState,
} from "./electromagnetism/magnetism";
export {
  computeLorentzForces,
  computeMagnetPairForces,
  computeMagnetPairTorques,
} from "./electromagnetism/lorentz";
export { emConstants, type EmConstants } from "./electromagnetism/constants";
export type {
  BallInput,
  BalloonInput,
  BoxInput,
  EngineInput,
  MagnetInput,
  RopeInput,
  HingeInput,
  SpringInput,
  PulleyInput,
  BeltInput,
  MaterialProps,
} from "./mechanics";

export {
  scenes,
  defaultSceneName,
  sceneIds,
  empty,
  engines,
  galton,
  random,
  welcome,
} from "./scenes";
export type { SceneFn, SceneName } from "./scenes";
