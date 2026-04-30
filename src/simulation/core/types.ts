export type Id = number & { readonly __brand: "SimulationId" };

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export type BodyKind = "ball" | "box";

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

export type BodySpec = BallSpec | BoxSpec;

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

export type BodyView = BallView | BoxView;

export interface Snapshot {
  readonly tick: number;
  readonly time: number;
  readonly bodies: readonly BodyView[];
}
