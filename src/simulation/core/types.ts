export type Id = number & { readonly __brand: "SimulationId" };

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export type BodyKind = "ball" | "box";

export interface BaseBodySpec {
  readonly kind: BodyKind;
  readonly position: Vec2;
  readonly angle?: number;
  readonly velocity?: Vec2;
  readonly angularVelocity?: number;
  readonly fixed?: boolean;
  readonly material?: string;
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

export interface BodyView {
  readonly id: Id;
  readonly kind: BodyKind;
  readonly position: Vec2;
  readonly angle: number;
  readonly velocity: Vec2;
  readonly angularVelocity: number;
  readonly charge: number;
}

export interface Snapshot {
  readonly tick: number;
  readonly time: number;
  readonly bodies: readonly BodyView[];
}
