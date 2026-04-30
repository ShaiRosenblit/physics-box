import * as planck from "planck";
import type { SimulationConfig } from "../core/config";
import type {
  Anchor,
  BodySpec,
  BodyView,
  ChargedSourceView,
  ConstraintSpec,
  ConstraintView,
  HingeSpec,
  Id,
  MagneticSourceView,
  PulleySpec,
  RopeSpec,
  Snapshot,
  SpringSpec,
  Vec2,
} from "../core/types";
import { lookupMaterial } from "../mechanics/materials";
import { PULLEY_DEFAULT_HALF_SPREAD } from "../mechanics/pulley";

const PULLEY_MIN_HALF_SPREAD = 0.05;

interface BodyRecord {
  readonly id: Id;
  readonly spec: BodySpec;
  readonly body: planck.Body;
}

interface DragState {
  readonly id: Id;
  readonly joint: planck.MouseJoint;
}

interface ConstraintRecord {
  readonly id: Id;
  readonly spec: ConstraintSpec;
  readonly internalBodies: planck.Body[];
  readonly joints: planck.Joint[];
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
  private readonly constraints = new Map<Id, ConstraintRecord>();
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
      if (typeof data === "number" && this.bodies.has(data as Id)) {
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

  /**
   * Live state of all magnets. Used by EM solvers to compute B fields
   * and dipole-on-dipole forces.
   */
  collectMagnets(): Array<{
    id: Id;
    position: Vec2;
    dipole: number;
  }> {
    const out: Array<{ id: Id; position: Vec2; dipole: number }> = [];
    for (const [id, record] of this.bodies) {
      if (record.spec.kind !== "magnet") continue;
      if (record.spec.dipole === 0) continue;
      const p = record.body.getPosition();
      out.push({
        id,
        position: { x: p.x, y: p.y },
        dipole: record.spec.dipole,
      });
    }
    return out;
  }

  /**
   * Snapshot of all charged bodies' current state. Cheap pass over the
   * bodies map; intended for the EM solvers that run once per substep.
   */
  collectChargedBodies(): Array<{
    id: Id;
    position: Vec2;
    velocity: Vec2;
    charge: number;
    mass: number;
  }> {
    const out: Array<{
      id: Id;
      position: Vec2;
      velocity: Vec2;
      charge: number;
      mass: number;
    }> = [];
    for (const [id, record] of this.bodies) {
      const q = record.spec.charge ?? 0;
      if (q === 0) continue;
      const p = record.body.getPosition();
      const v = record.body.getLinearVelocity();
      out.push({
        id,
        position: { x: p.x, y: p.y },
        velocity: { x: v.x, y: v.y },
        charge: q,
        mass: record.body.getMass(),
      });
    }
    return out;
  }

  /** Apply per-body forces (in N, world coords) to the underlying bodies. */
  applyForces(forces: Map<Id, Vec2>): void {
    for (const [id, f] of forces) {
      const record = this.bodies.get(id);
      if (!record) continue;
      record.body.applyForceToCenter(planck.Vec2(f.x, f.y), true);
    }
  }

  addConstraint(id: Id, spec: ConstraintSpec): void {
    if (this.constraints.has(id)) {
      throw new Error(`PlanckAdapter.addConstraint: id ${id} already exists`);
    }
    if (spec.kind === "rope") {
      this.constraints.set(id, this.buildRope(id, spec));
      return;
    }
    if (spec.kind === "hinge") {
      this.constraints.set(id, this.buildHinge(id, spec));
      return;
    }
    if (spec.kind === "spring") {
      this.constraints.set(id, this.buildSpring(id, spec));
      return;
    }
    if (spec.kind === "pulley") {
      this.constraints.set(id, this.buildPulley(id, spec));
      return;
    }
    const exhaustive: never = spec;
    throw new Error(
      `PlanckAdapter.addConstraint: unknown kind ${(exhaustive as { kind: string }).kind}`,
    );
  }

  removeConstraint(id: Id): void {
    const record = this.constraints.get(id);
    if (!record) return;
    for (const joint of record.joints) this.world.destroyJoint(joint);
    for (const body of record.internalBodies) this.world.destroyBody(body);
    this.constraints.delete(id);
  }

  hasConstraint(id: Id): boolean {
    return this.constraints.has(id);
  }

  buildSnapshot(tick: number, time: number): Snapshot {
    const ids = Array.from(this.bodies.keys()).sort((a, b) => a - b);
    const bodies: BodyView[] = ids.map((id) => {
      const record = this.bodies.get(id)!;
      return buildView(record);
    });

    const constraintIds = Array.from(this.constraints.keys()).sort(
      (a, b) => a - b,
    );
    const constraints: ConstraintView[] = constraintIds.map((id) => {
      const record = this.constraints.get(id)!;
      return buildConstraintView(record);
    });

    const charges: ChargedSourceView[] = [];
    const magnets: MagneticSourceView[] = [];
    for (const id of ids) {
      const record = this.bodies.get(id)!;
      const q = record.spec.charge ?? 0;
      if (q !== 0) {
        const p = record.body.getPosition();
        charges.push(
          Object.freeze({
            id,
            position: Object.freeze({ x: p.x, y: p.y }),
            charge: q,
          }),
        );
      }
      if (record.spec.kind === "magnet" && record.spec.dipole !== 0) {
        const p = record.body.getPosition();
        magnets.push(
          Object.freeze({
            id,
            position: Object.freeze({ x: p.x, y: p.y }),
            dipole: record.spec.dipole,
          }),
        );
      }
    }

    return Object.freeze({
      tick,
      time,
      bodies: Object.freeze(bodies),
      constraints: Object.freeze(constraints),
      charges: Object.freeze(charges),
      magnets: Object.freeze(magnets),
    });
  }

  private resolveAnchor(anchor: Anchor): {
    body: planck.Body;
    worldPoint: planck.Vec2;
  } {
    if (anchor.kind === "world") {
      return {
        body: this.groundBody,
        worldPoint: planck.Vec2(anchor.point.x, anchor.point.y),
      };
    }
    const record = this.bodies.get(anchor.id);
    if (!record) {
      throw new Error(`Anchor refers to unknown body id ${anchor.id}`);
    }
    const local = anchor.localPoint ?? { x: 0, y: 0 };
    const worldPoint = record.body.getWorldPoint(planck.Vec2(local.x, local.y));
    return {
      body: record.body,
      worldPoint: planck.Vec2(worldPoint.x, worldPoint.y),
    };
  }

  private buildRope(id: Id, spec: RopeSpec): ConstraintRecord {
    const start = this.resolveAnchor(spec.a);
    const end = this.resolveAnchor(spec.b);

    const span = planck.Vec2.sub(end.worldPoint, start.worldPoint);
    const distance = span.length();
    const length = Math.max(spec.length, Math.max(distance, 0.05));
    const segments = Math.max(2, spec.segments ?? Math.max(6, Math.round(length / 0.18)));
    const segLen = length / (segments + 1);
    const segRadius = Math.max(0.04, segLen * 0.2);
    const material = lookupMaterial(spec.material ?? "wood");

    const internalBodies: planck.Body[] = [];
    const joints: planck.Joint[] = [];

    let prev = start.body;
    let prevAnchor = start.worldPoint;
    for (let i = 1; i <= segments; i++) {
      const t = i / (segments + 1);
      const x = start.worldPoint.x + span.x * t;
      const y = start.worldPoint.y + span.y * t;

      const segBody = this.world.createBody({
        type: "dynamic",
        position: planck.Vec2(x, y),
        linearDamping: 0.05,
        angularDamping: 0.05,
        userData: `__rope:${id}:${i}`,
      });
      segBody.createFixture({
        shape: new planck.CircleShape(segRadius),
        density: material.density,
        friction: material.friction,
        restitution: 0.05,
        filterCategoryBits: 0x0002,
        filterMaskBits: 0xfffd,
      });
      internalBodies.push(segBody);

      const segCenter = planck.Vec2(x, y);
      const joint = new planck.DistanceJoint(
        { frequencyHz: 0, dampingRatio: 0, length: segLen },
        prev,
        segBody,
        prevAnchor,
        segCenter,
      );
      this.world.createJoint(joint);
      joints.push(joint);

      prev = segBody;
      prevAnchor = segCenter;
    }

    const finalJoint = new planck.DistanceJoint(
      { frequencyHz: 0, dampingRatio: 0, length: segLen },
      prev,
      end.body,
      prevAnchor,
      end.worldPoint,
    );
    this.world.createJoint(finalJoint);
    joints.push(finalJoint);

    return { id, spec, internalBodies, joints };
  }

  private buildHinge(id: Id, spec: HingeSpec): ConstraintRecord {
    const recordA = this.bodies.get(spec.bodyA);
    if (!recordA) {
      throw new Error(`hinge: bodyA id ${spec.bodyA} not found`);
    }
    const bodyB = spec.bodyB === undefined
      ? this.groundBody
      : this.bodies.get(spec.bodyB)?.body;
    if (!bodyB) {
      throw new Error(`hinge: bodyB id ${spec.bodyB} not found`);
    }
    const anchor = planck.Vec2(spec.worldAnchor.x, spec.worldAnchor.y);
    const joint = new planck.RevoluteJoint(
      {},
      recordA.body,
      bodyB,
      anchor,
    );
    this.world.createJoint(joint);
    return { id, spec, internalBodies: [], joints: [joint] };
  }

  private buildSpring(id: Id, spec: SpringSpec): ConstraintRecord {
    const a = this.resolveAnchor(spec.a);
    const b = this.resolveAnchor(spec.b);
    const span = planck.Vec2.sub(b.worldPoint, a.worldPoint);
    const distance = span.length();
    const restLength = Math.max(0.05, spec.restLength ?? distance);
    const joint = new planck.DistanceJoint(
      {
        frequencyHz: spec.frequencyHz ?? 4,
        dampingRatio: spec.dampingRatio ?? 0.5,
        length: restLength,
      },
      a.body,
      b.body,
      a.worldPoint,
      b.worldPoint,
    );
    this.world.createJoint(joint);
    return { id, spec, internalBodies: [], joints: [joint] };
  }

  private buildPulley(id: Id, spec: PulleySpec): ConstraintRecord {
    const recA = this.bodies.get(spec.bodyA);
    const recB = this.bodies.get(spec.bodyB);
    if (!recA) {
      throw new Error(`pulley: bodyA id ${spec.bodyA} not found`);
    }
    if (!recB) {
      throw new Error(`pulley: bodyB id ${spec.bodyB} not found`);
    }
    if (!recA.body.isDynamic() || !recB.body.isDynamic()) {
      throw new Error(
        "pulley: Planck PulleyJoint requires two dynamic bodies",
      );
    }

    const spread = Math.max(
      PULLEY_MIN_HALF_SPREAD,
      spec.halfSpread ?? PULLEY_DEFAULT_HALF_SPREAD,
    );
    const cx = spec.wheelCenter.x;
    const cy = spec.wheelCenter.y;
    const groundA = planck.Vec2(cx - spread, cy);
    const groundB = planck.Vec2(cx + spread, cy);

    const wa = recA.body.getWorldPoint(
      planck.Vec2(spec.localAnchorA.x, spec.localAnchorA.y),
    );
    const wb = recB.body.getWorldPoint(
      planck.Vec2(spec.localAnchorB.x, spec.localAnchorB.y),
    );
    const worldA = planck.Vec2(wa.x, wa.y);
    const worldB = planck.Vec2(wb.x, wb.y);

    const ratio = spec.ratio ?? 1;
    const joint = new planck.PulleyJoint(
      { collideConnected: false },
      recA.body,
      recB.body,
      groundA,
      groundB,
      worldA,
      worldB,
      ratio,
    );
    this.world.createJoint(joint);
    return { id, spec, internalBodies: [], joints: [joint] };
  }
}

function makeShape(spec: BodySpec): planck.Shape {
  if (spec.kind === "ball") {
    return new planck.CircleShape(spec.radius);
  }
  if (spec.kind === "magnet") {
    return new planck.CircleShape(spec.radius);
  }
  return new planck.BoxShape(spec.width / 2, spec.height / 2);
}

function buildConstraintView(record: ConstraintRecord): ConstraintView {
  const { id, spec } = record;
  if (spec.kind === "rope") {
    const path: Vec2[] = [];
    const startJoint = record.joints[0];
    if (startJoint) {
      const a = startJoint.getAnchorA();
      path.push(Object.freeze({ x: a.x, y: a.y }));
    }
    for (const body of record.internalBodies) {
      const p = body.getPosition();
      path.push(Object.freeze({ x: p.x, y: p.y }));
    }
    const endJoint = record.joints[record.joints.length - 1];
    if (endJoint) {
      const b = endJoint.getAnchorB();
      path.push(Object.freeze({ x: b.x, y: b.y }));
    }
    return Object.freeze({
      id,
      kind: "rope" as const,
      path: Object.freeze(path),
      material: spec.material ?? "wood",
    });
  }

  if (spec.kind === "hinge") {
    const joint = record.joints[0];
    const anchorVec = joint.getAnchorA();
    return Object.freeze({
      id,
      kind: "hinge" as const,
      anchor: Object.freeze({ x: anchorVec.x, y: anchorVec.y }),
      bodyA: spec.bodyA,
      bodyB: spec.bodyB,
    });
  }

  if (spec.kind === "spring") {
    const joint = record.joints[0] as planck.DistanceJoint;
    const a = joint.getAnchorA();
    const b = joint.getAnchorB();
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const restLength = (joint as { getLength?: () => number }).getLength?.() ??
      spec.restLength ??
      Math.hypot(dx, dy);
    return Object.freeze({
      id,
      kind: "spring" as const,
      a: Object.freeze({ x: a.x, y: a.y }),
      b: Object.freeze({ x: b.x, y: b.y }),
      restLength,
      currentLength: Math.hypot(dx, dy),
    });
  }

  if (spec.kind === "pulley") {
    const joint = record.joints[0] as planck.PulleyJoint;
    const ga = joint.getGroundAnchorA();
    const gb = joint.getGroundAnchorB();
    const aa = joint.getAnchorA();
    const ab = joint.getAnchorB();
    const spread = Math.max(
      PULLEY_MIN_HALF_SPREAD,
      spec.halfSpread ?? PULLEY_DEFAULT_HALF_SPREAD,
    );
    return Object.freeze({
      id,
      kind: "pulley" as const,
      wheelCenter: Object.freeze({
        x: spec.wheelCenter.x,
        y: spec.wheelCenter.y,
      }),
      halfSpread: spread,
      groundA: Object.freeze({ x: ga.x, y: ga.y }),
      groundB: Object.freeze({ x: gb.x, y: gb.y }),
      anchorA: Object.freeze({ x: aa.x, y: aa.y }),
      anchorB: Object.freeze({ x: ab.x, y: ab.y }),
      ratio: spec.ratio ?? 1,
    });
  }

  const exhaustive: never = spec;
  throw new Error(
    `buildConstraintView: unknown kind ${(exhaustive as { kind: string }).kind}`,
  );
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
  if (spec.kind === "magnet") {
    return Object.freeze({
      ...base,
      kind: "magnet" as const,
      radius: spec.radius,
      dipole: spec.dipole,
    });
  }
  return Object.freeze({
    ...base,
    kind: "box" as const,
    width: spec.width,
    height: spec.height,
  });
}
