import * as planck from "planck";
import type { SimulationConfig } from "../core/config";
import type { BodySpec, BodyView, Id, Snapshot } from "../core/types";
import { lookupMaterial } from "../mechanics/materials";

interface BodyRecord {
  readonly id: Id;
  readonly spec: BodySpec;
  readonly body: planck.Body;
}

/**
 * The single point of contact with Planck.js.
 *
 * Translates normalized BodySpecs into Planck bodies/fixtures, advances
 * the underlying Planck world by exactly one fixed substep, and produces
 * frozen Snapshot objects from current Planck state.
 *
 * Per `01-architecture.mdc` this is the ONLY file in the codebase that
 * may import the `planck` module.
 */
export class PlanckAdapter {
  private readonly world: planck.World;
  private readonly bodies = new Map<Id, BodyRecord>();

  constructor(config: SimulationConfig) {
    this.world = new planck.World(planck.Vec2(config.gravity.x, config.gravity.y));
    this.world.setAllowSleeping(true);
  }

  add(id: Id, spec: BodySpec): void {
    const body = this.world.createBody({
      type: spec.fixed ? "static" : "dynamic",
      position: planck.Vec2(spec.position.x, spec.position.y),
      angle: spec.angle ?? 0,
      linearVelocity: spec.velocity
        ? planck.Vec2(spec.velocity.x, spec.velocity.y)
        : planck.Vec2(0, 0),
      angularVelocity: spec.angularVelocity ?? 0,
      userData: id,
      linearDamping: 0,
      angularDamping: 0,
    });

    const material = lookupMaterial(spec.material);
    const shape = makeShape(spec);

    body.createFixture({
      shape,
      density: material.density,
      friction: material.friction,
      restitution: material.restitution,
    });

    this.bodies.set(id, { id, spec, body });
  }

  remove(id: Id): void {
    const record = this.bodies.get(id);
    if (!record) return;
    this.world.destroyBody(record.body);
    this.bodies.delete(id);
  }

  has(id: Id): boolean {
    return this.bodies.has(id);
  }

  /** Advance the underlying world by exactly one fixed substep. */
  stepOnce(dt: number, velIters: number, posIters: number): void {
    this.world.step(dt, velIters, posIters);
  }

  buildSnapshot(tick: number, time: number): Snapshot {
    const ids = Array.from(this.bodies.keys()).sort((a, b) => a - b);
    const bodies: BodyView[] = ids.map((id) => {
      const record = this.bodies.get(id)!;
      return buildView(record);
    });
    return Object.freeze({
      tick,
      time,
      bodies: Object.freeze(bodies),
    });
  }
}

function makeShape(spec: BodySpec): planck.Shape {
  if (spec.kind === "ball") {
    return new planck.CircleShape(spec.radius);
  }
  return new planck.BoxShape(spec.width / 2, spec.height / 2);
}

function buildView(record: BodyRecord): BodyView {
  const { id, spec, body } = record;
  const p = body.getPosition();
  const v = body.getLinearVelocity();
  const base = {
    id,
    position: Object.freeze({ x: p.x, y: p.y }),
    angle: body.getAngle(),
    velocity: Object.freeze({ x: v.x, y: v.y }),
    angularVelocity: body.getAngularVelocity(),
    material: spec.material ?? "wood",
    charge: spec.charge ?? 0,
    fixed: spec.fixed ?? false,
  } as const;

  if (spec.kind === "ball") {
    return Object.freeze({ ...base, kind: "ball" as const, radius: spec.radius });
  }
  return Object.freeze({
    ...base,
    kind: "box" as const,
    width: spec.width,
    height: spec.height,
  });
}
