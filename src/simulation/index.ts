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
  BalloonSpec,
  BoxSpec,
  BoxView,
  CrankSpec,
  CrankView,
  BodyView,
  BallView,
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
  WeldSpec,
  WeldView,
  Snapshot,
  Vec2,
} from "./core/types";

export {
  ball,
  balloon,
  box,
  crank,
  engine,
  magnet,
  rope,
  hinge,
  spring,
  pulley,
  belt,
  weld,
  PULLEY_DEFAULT_HALF_SPREAD,
  materials,
  worldAnchor,
  bodyAnchor,
} from "./mechanics";
export type { WeldInput } from "./mechanics";

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
  CrankInput,
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
  catapult,
  doublePendulum,
  empty,
  engines,
  galton,
  newtonsCradle,
  random,
  welcome,
} from "./scenes";
export type { SceneFn, SceneName } from "./scenes";
