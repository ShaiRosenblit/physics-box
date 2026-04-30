export type Id = number & { readonly __brand: "SimulationId" };

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export type BodyKind = "ball" | "box" | "magnet";

export type MaterialName = "wood" | "metal" | "cork";

export interface BaseBodySpec {
  readonly position: Vec2;
  readonly angle?: number;
  readonly velocity?: Vec2;
  readonly angularVelocity?: number;
  readonly fixed?: boolean;
  readonly material?: MaterialName;
  readonly charge?: number;
}

export interface BallSpec extends BaseBodySpec {
  readonly kind: "ball";
  readonly radius: number;
}

export interface BoxSpec extends BaseBodySpec {
  readonly kind: "box";
  readonly width: number;
  readonly height: number;
}

export interface MagnetSpec extends BaseBodySpec {
  readonly kind: "magnet";
  readonly radius: number;
  /** Signed scalar dipole moment. + is "north" by convention. */
  readonly dipole: number;
}

export type BodySpec = BallSpec | BoxSpec | MagnetSpec;

export interface BaseBodyView {
  readonly id: Id;
  readonly position: Vec2;
  readonly angle: number;
  readonly velocity: Vec2;
  readonly angularVelocity: number;
  readonly material: MaterialName;
  readonly charge: number;
  readonly fixed: boolean;
}

export interface BallView extends BaseBodyView {
  readonly kind: "ball";
  readonly radius: number;
}

export interface BoxView extends BaseBodyView {
  readonly kind: "box";
  readonly width: number;
  readonly height: number;
}

export interface MagnetView extends BaseBodyView {
  readonly kind: "magnet";
  readonly radius: number;
  readonly dipole: number;
}

export type BodyView = BallView | BoxView | MagnetView;

export type Anchor =
  | { readonly kind: "world"; readonly point: Vec2 }
  | { readonly kind: "body"; readonly id: Id; readonly localPoint?: Vec2 };

export type ConstraintKind = "rope" | "hinge" | "spring";

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

export type ConstraintSpec = RopeSpec | HingeSpec | SpringSpec;

export interface RopeView {
  readonly id: Id;
  readonly kind: "rope";
  readonly path: readonly Vec2[];
  readonly material: MaterialName;
}

export interface HingeView {
  readonly id: Id;
  readonly kind: "hinge";
  readonly anchor: Vec2;
}

export interface SpringView {
  readonly id: Id;
  readonly kind: "spring";
  readonly a: Vec2;
  readonly b: Vec2;
  readonly restLength: number;
  readonly currentLength: number;
}

export type ConstraintView = RopeView | HingeView | SpringView;

export interface ChargedSourceView {
  readonly id: Id;
  readonly position: Vec2;
  readonly charge: number;
}

export interface MagneticSourceView {
  readonly id: Id;
  readonly position: Vec2;
  readonly dipole: number;
}

export interface Snapshot {
  readonly tick: number;
  readonly time: number;
  readonly bodies: readonly BodyView[];
  readonly constraints: readonly ConstraintView[];
  readonly charges: readonly ChargedSourceView[];
  readonly magnets: readonly MagneticSourceView[];
}
