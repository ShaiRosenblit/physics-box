export type Id = number & { readonly __brand: "SimulationId" };

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export type BodyKind =
  | "ball"
  | "balloon"
  | "box"
  | "crank"
  | "engine"
  | "engine_rotor"
  | "magnet";

export type MaterialName = "wood" | "metal" | "cork" | "felt" | "latex";

export interface BaseBodySpec {
  readonly position: Vec2;
  readonly angle?: number;
  readonly velocity?: Vec2;
  readonly angularVelocity?: number;
  readonly fixed?: boolean;
  readonly material?: MaterialName;
  readonly charge?: number;
  /** Overrides `material.restitution` for this body's fixtures when set. */
  readonly fixtureRestitution?: number;
  /** Overrides `material.friction` for this body's fixtures when set. */
  readonly fixtureFriction?: number;
  /** Planck body linear damping (default 0). */
  readonly linearDamping?: number;
  /** Planck body angular damping (default 0). */
  readonly angularDamping?: number;
  /** Scales Archimedes and prescriptive lift; 0 disables both for this body. */
  readonly buoyancyScale?: number;
  /** Extra lift (N) along −gravity direction (helium-style); 0 = none. */
  readonly buoyancyLift?: number;
}

export interface BallSpec extends BaseBodySpec {
  readonly kind: "ball";
  readonly radius: number;
  /** When false, dynamic balls ignore collisions with other dynamic balls using this flag (still hit pegs, boxes, rope links). */
  readonly collideWithBalls?: boolean;
}

export interface BalloonSpec extends BaseBodySpec {
  readonly kind: "balloon";
  readonly radius: number;
  readonly collideWithBalls?: boolean;
}

export interface BoxSpec extends BaseBodySpec {
  readonly kind: "box";
  readonly width: number;
  readonly height: number;
}

/**
 * Circular flywheel with an off-center pin (local body space). In the canvas,
 * rope/spring taps convert the hit point to body-local anchors so you can tie
 * off at the pin (or elsewhere on the wheel). The pin must lie on or inside
 * the wheel radius.
 */
export interface CrankSpec extends BaseBodySpec {
  readonly kind: "crank";
  readonly radius: number;
  readonly pinLocal: Vec2;
  /** When false, dynamic cranks ignore collisions with other dynamic balls. */
  readonly collideWithBalls?: boolean;
}

/** Rectangular housing; rotor is a separate body in a revolute joint. */
export interface EngineSpec extends BaseBodySpec {
  readonly kind: "engine";
  readonly width: number;
  readonly height: number;
  /** Dynamic disc radius; must fit inside the housing (sanitized on add/patch). */
  readonly rotorRadius: number;
  /** Target rotor speed (rpm); CCW positive. Planck RevoluteJoint motor. */
  readonly rpm: number;
  /** Motor stall torque limit (N·m); solver clamps magnitude to config maxMotorTorque. */
  readonly maxTorque: number;
}

/** Internal: flywheel driven by parent `EngineSpec` (same assembly). Not spawned via `World.add` alone. */
export interface EngineRotorSpec extends BaseBodySpec {
  readonly kind: "engine_rotor";
  readonly radius: number;
  readonly housingId: Id;
}

export interface MagnetSpec extends BaseBodySpec {
  readonly kind: "magnet";
  readonly radius: number;
  /**
   * Signed dipole magnitude (A·m²). Direction follows the body’s +x axis
   * (`angle`): moment = dipole × (cos θ, sin θ). Sign flips “north” vs “south”
   * along that axis.
   */
  readonly dipole: number;
}

export type BodySpec =
  | BallSpec
  | BalloonSpec
  | BoxSpec
  | CrankSpec
  | EngineSpec
  | EngineRotorSpec
  | MagnetSpec;

/** Sparse mutation payload for patchBody — ignored keys stay unchanged. */
export interface BodyPatch {
  readonly position?: Vec2;
  readonly angle?: number;
  readonly charge?: number;
  readonly material?: MaterialName;
  readonly fixed?: boolean;
  readonly linearDamping?: number;
  readonly angularDamping?: number;
  readonly fixtureFriction?: number;
  readonly fixtureRestitution?: number;
  /** When false, ball ghosts through other dynamic balls (fixture filter). */
  readonly collideWithBalls?: boolean;
  readonly buoyancyScale?: number;
  readonly buoyancyLift?: number;
  readonly radius?: number;
  readonly width?: number;
  readonly height?: number;
  readonly dipole?: number;
  readonly rpm?: number;
  readonly maxTorque?: number;
  readonly rotorRadius?: number;
  /** Crank pin offset in body-local coordinates (m). */
  readonly pinLocal?: Vec2;
}

export interface BaseBodyView {
  readonly id: Id;
  readonly position: Vec2;
  readonly angle: number;
  readonly velocity: Vec2;
  readonly angularVelocity: number;
  readonly material: MaterialName;
  readonly charge: number;
  readonly fixed: boolean;
  readonly linearDamping: number;
  readonly angularDamping: number;
  readonly buoyancyScale: number;
  readonly buoyancyLift: number;
}

export interface BallView extends BaseBodyView {
  readonly kind: "ball";
  readonly radius: number;
  /** True when collisions with other dynamic balls are enabled. */
  readonly collideDynamicBalls: boolean;
}

export interface BalloonView extends BaseBodyView {
  readonly kind: "balloon";
  readonly radius: number;
  readonly collideDynamicBalls: boolean;
}

export interface BoxView extends BaseBodyView {
  readonly kind: "box";
  readonly width: number;
  readonly height: number;
}

export interface EngineHousingView extends BaseBodyView {
  readonly kind: "engine";
  readonly width: number;
  readonly height: number;
  readonly rotorRadius: number;
  readonly rpm: number;
  readonly maxTorque: number;
  readonly rotorId: Id;
}

export interface EngineRotorView extends BaseBodyView {
  readonly kind: "engine_rotor";
  readonly radius: number;
  readonly rpm: number;
  readonly maxTorque: number;
  readonly housingId: Id;
}

export interface MagnetView extends BaseBodyView {
  readonly kind: "magnet";
  readonly radius: number;
  readonly dipole: number;
}

export interface CrankView extends BaseBodyView {
  readonly kind: "crank";
  readonly radius: number;
  readonly pinLocal: Vec2;
  readonly collideDynamicBalls: boolean;
}

export type BodyView =
  | BallView
  | BalloonView
  | BoxView
  | CrankView
  | EngineHousingView
  | EngineRotorView
  | MagnetView;

export type Anchor =
  | { readonly kind: "world"; readonly point: Vec2 }
  | { readonly kind: "body"; readonly id: Id; readonly localPoint?: Vec2 };

export type ConstraintKind = "rope" | "hinge" | "spring" | "pulley" | "belt";

export interface RopeSpec {
  readonly kind: "rope";
  readonly a: Anchor;
  readonly b: Anchor;
  readonly length: number;
  readonly segments?: number;
  readonly material?: MaterialName;
}

export interface HingeSpec {
  readonly kind: "hinge";
  readonly bodyA: Id;
  readonly bodyB?: Id;
  readonly worldAnchor: Vec2;
}

export interface SpringSpec {
  readonly kind: "spring";
  readonly a: Anchor;
  readonly b: Anchor;
  readonly restLength?: number;
  readonly frequencyHz?: number;
  readonly dampingRatio?: number;
}

/** Ideal pulley via Planck `PulleyJoint`: two dynamic bodies, fixed wheel axis in world space. */
export interface PulleySpec {
  readonly kind: "pulley";
  readonly wheelCenter: Vec2;
  readonly bodyA: Id;
  readonly bodyB: Id;
  readonly localAnchorA: Vec2;
  readonly localAnchorB: Vec2;
  readonly halfSpread?: number;
  readonly ratio?: number;
}

/**
 * Open belt coupling engine flywheel rotation to a driven body via Planck
 * `GearJoint` and two `RevoluteJoint`s (housing–rotor, ground–driven).
 */
export interface BeltSpec {
  readonly kind: "belt";
  readonly driverRotorId: Id;
  readonly drivenBodyId: Id;
  /** Planck gear ratio; omit for −r_driven/r_driver (same-direction rolling). */
  readonly ratio?: number;
}

export type ConstraintSpec =
  | RopeSpec
  | HingeSpec
  | SpringSpec
  | PulleySpec
  | BeltSpec;

/** Sparse updates for patchConstraint — only fields valid for this kind apply. */
export interface ConstraintPatch {
  readonly length?: number;
  readonly segments?: number;
  readonly material?: MaterialName;
  readonly restLength?: number;
  readonly frequencyHz?: number;
  readonly dampingRatio?: number;
  readonly worldAnchor?: Vec2;
  readonly halfSpread?: number;
  readonly ratio?: number;
}

export interface RopeView {
  readonly id: Id;
  readonly kind: "rope";
  readonly path: readonly Vec2[];
  readonly material: MaterialName;
  /** Nominal constrained length (`RopeSpec.length`). */
  readonly nominalLength: number;
  /** Segment count baked into this chain (`RopeSpec.segments` resolved at build time). */
  readonly segmentLinks: number;
}

export interface HingeView {
  readonly id: Id;
  readonly kind: "hinge";
  readonly anchor: Vec2;
  /** First body in the revolute (always present). */
  readonly bodyA: Id;
  /** Second body when body-to-body; omitted when hinged to world/ground. */
  readonly bodyB?: Id;
}

export interface SpringView {
  readonly id: Id;
  readonly kind: "spring";
  readonly a: Vec2;
  readonly b: Vec2;
  readonly restLength: number;
  readonly currentLength: number;
  readonly frequencyHz: number;
  readonly dampingRatio: number;
}

export interface PulleyView {
  readonly id: Id;
  readonly kind: "pulley";
  readonly wheelCenter: Vec2;
  readonly halfSpread: number;
  readonly groundA: Vec2;
  readonly groundB: Vec2;
  readonly anchorA: Vec2;
  readonly anchorB: Vec2;
  readonly ratio: number;
}

export interface BeltView {
  readonly id: Id;
  readonly kind: "belt";
  /** Screen / hit path: upper strand, lower strand, closed. */
  readonly path: readonly Vec2[];
  readonly driverRotorId: Id;
  readonly drivenBodyId: Id;
  /** Resolved Planck gear ratio. */
  readonly ratio: number;
}

export type ConstraintView =
  | RopeView
  | HingeView
  | SpringView
  | PulleyView
  | BeltView;

export interface ChargedSourceView {
  readonly id: Id;
  readonly position: Vec2;
  readonly charge: number;
}

export interface MagneticSourceView {
  readonly id: Id;
  readonly position: Vec2;
  readonly dipole: number;
  /** Radians; dipole direction is `dipole × (cos(angle), sin(angle))`. */
  readonly angle: number;
}

export interface Snapshot {
  readonly tick: number;
  readonly time: number;
  readonly bodies: readonly BodyView[];
  readonly constraints: readonly ConstraintView[];
  readonly charges: readonly ChargedSourceView[];
  readonly magnets: readonly MagneticSourceView[];
}
