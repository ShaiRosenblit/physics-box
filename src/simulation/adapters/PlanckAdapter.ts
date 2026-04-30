import * as planck from "planck";
import type { SimulationConfig } from "../core/config";
import type { BodySpec, BodyView, Id, Snapshot, Vec2 } from "../core/types";
import { lookupMaterial } from "../mechanics/materials";

interface BodyRecord {
  readonly id: Id;
  readonly spec: BodySpec;
  readonly body: planck.Body;
}

interface DragState {
  readonly id: Id;
  readonly joint: planck.MouseJoint;
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
  private readonly groundBody: planck.Body;
  private dragState: DragState | null = null;

  constructor(config: SimulationConfig) {
    this.world = new planck.World(planck.Vec2(config.gravity.x, config.gravity.y));
    this.world.setAllowSleeping(true);
    this.groundBody = this.world.createBody();
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
    if (this.dragState?.id === id) this.endDrag();
    this.world.destroyBody(record.body);
    this.bodies.delete(id);
  }

  /**
   * Find the body whose fixtures contain the given world point. Returns
   * null if none. Static and kinematic bodies are skipped — only dynamic
   * bodies are draggable.
   */
  findDynamicBodyAt(p: Vec2): Id | null {
    const eps = 1e-3;
    const aabb = new planck.AABB(
      planck.Vec2(p.x - eps, p.y - eps),
      planck.Vec2(p.x + eps, p.y + eps),
    );
    let foundId: Id | null = null;
    const target = planck.Vec2(p.x, p.y);
    this.world.queryAABB(aabb, (fixture) => {
      const body = fixture.getBody();
      if (!body.isDynamic()) return true;
      if (!fixture.testPoint(target)) return true;
      const data = body.getUserData();
      if (typeof data === "number") {
        foundId = data as Id;
        return false;
      }
      return true;
    });
    return foundId;
  }

  startDrag(id: Id, target: Vec2): boolean {
    const record = this.bodies.get(id);
    if (!record) return false;
    if (!record.body.isDynamic()) return false;
    if (this.dragState) this.endDrag();

    record.body.setAwake(true);
    const mass = Math.max(record.body.getMass(), 0.05);
    const joint = new planck.MouseJoint(
      {
        maxForce: 1000 * mass,
        frequencyHz: 5,
        dampingRatio: 0.7,
      },
      this.groundBody,
      record.body,
      planck.Vec2(target.x, target.y),
    );
    this.world.createJoint(joint);
    this.dragState = { id, joint };
    return true;
  }

  updateDrag(target: Vec2): void {
    if (!this.dragState) return;
    this.dragState.joint.setTarget(planck.Vec2(target.x, target.y));
  }

  endDrag(): void {
    if (!this.dragState) return;
    this.world.destroyJoint(this.dragState.joint);
    this.dragState = null;
  }

  get isDragging(): boolean {
    return this.dragState !== null;
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
