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
import {
  ropeRebuildNeeded,
  springAnchorsMatch,
} from "../core/constraintPatch";
import { lookupMaterial } from "../mechanics/materials";
import { PULLEY_DEFAULT_HALF_SPREAD } from "../mechanics/pulley";

const PULLEY_MIN_HALF_SPREAD = 0.05;

/** Dynamic balls that ghost through each other (Galton marbles); still collide with default fixtures & rope links. */
const CAT_NO_DYNAMIC_BALL_COLLISION = 0x0010;

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

  /** Sets global gravity (SI-shaped units, same as simulation config). */
  setGravity(g: Vec2): void {
    this.world.setGravity(planck.Vec2(g.x, g.y));
  }

  add(id: Id, spec: BodySpec): void {
    const material = lookupMaterial(spec.material);
    const body = this.world.createBody({
      type: spec.fixed ? "static" : "dynamic",
      position: planck.Vec2(spec.position.x, spec.position.y),
      angle: spec.angle ?? 0,
      linearVelocity: spec.velocity
        ? planck.Vec2(spec.velocity.x, spec.velocity.y)
        : planck.Vec2(0, 0),
      angularVelocity: spec.angularVelocity ?? 0,
      userData: id,
      linearDamping: spec.linearDamping ?? 0,
      angularDamping: spec.angularDamping ?? 0,
    });

    const shape = makeShape(spec);

    const filter = collisionFilter(spec);
    body.createFixture({
      shape,
      density: material.density,
      friction: spec.fixtureFriction ?? material.friction,
      restitution: spec.fixtureRestitution ?? material.restitution,
      ...(filter ?? {}),
    });

    this.bodies.set(id, { id, spec, body });
  }

  /** @internal — consumed by World.patchBody merge path. */
  getBodySpec(id: Id): BodySpec | undefined {
    return this.bodies.get(id)?.spec;
  }

  /**
   * Apply a full next spec to an existing body (pose and velocities unchanged).
   * Kind must match the existing body.
   */
  applyBodySpec(id: Id, nextSpec: BodySpec): void {
    const record = this.bodies.get(id);
    if (!record) return;
    const oldSpec = record.spec;
    if (oldSpec.kind !== nextSpec.kind) {
      throw new Error(`applyBodySpec: kind ${oldSpec.kind} cannot become ${nextSpec.kind}`);
    }

    if (this.dragState?.id === id && (nextSpec.fixed ?? false)) this.endDrag();

    const body = record.body;
    const rebuild = fixturesNeedRebuild(oldSpec, nextSpec);
    const fixedChanged = (oldSpec.fixed ?? false) !== (nextSpec.fixed ?? false);

    if (rebuild) {
      rebuildBodyFixtures(body, nextSpec);
    }

    if (fixedChanged) {
      if (nextSpec.fixed) {
        body.setStatic();
        body.setLinearVelocity(planck.Vec2(0, 0));
        body.setAngularVelocity(0);
      } else {
        body.setDynamic();
      }
    }

    body.setLinearDamping(nextSpec.linearDamping ?? 0);
    body.setAngularDamping(nextSpec.angularDamping ?? 0);

    this.bodies.set(id, { id, spec: nextSpec, body });
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
    angle: number;
  }> {
    const out: Array<{ id: Id; position: Vec2; dipole: number; angle: number }> =
      [];
    for (const [id, record] of this.bodies) {
      if (record.spec.kind !== "magnet") continue;
      if (record.spec.dipole === 0) continue;
      const p = record.body.getPosition();
      out.push({
        id,
        position: { x: p.x, y: p.y },
        dipole: record.spec.dipole,
        angle: record.body.getAngle(),
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

  applyTorques(torques: Map<Id, number>): void {
    for (const [id, t] of torques) {
      const record = this.bodies.get(id);
      if (!record) continue;
      record.body.applyTorque(t, true);
    }
  }

  private disposeConstraintRecord(record: ConstraintRecord): void {
    for (const joint of record.joints) this.world.destroyJoint(joint);
    for (const body of record.internalBodies) this.world.destroyBody(body);
  }

  private installConstraintInternal(id: Id, spec: ConstraintSpec): void {
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
      `PlanckAdapter.installConstraintInternal: unknown kind ${(exhaustive as { kind: string }).kind}`,
    );
  }

  addConstraint(id: Id, spec: ConstraintSpec): void {
    if (this.constraints.has(id)) {
      throw new Error(`PlanckAdapter.addConstraint: id ${id} already exists`);
    }
    this.installConstraintInternal(id, spec);
  }

  /** Replace kinematic chain / joints while keeping the stable constraint id. */
  replaceConstraintKeepingId(id: Id, spec: ConstraintSpec): void {
    const old = this.constraints.get(id);
    if (!old) return;
    this.disposeConstraintRecord(old);
    this.constraints.delete(id);
    this.installConstraintInternal(id, spec);
  }

  removeConstraint(id: Id): void {
    const record = this.constraints.get(id);
    if (!record) return;
    this.disposeConstraintRecord(record);
    this.constraints.delete(id);
  }

  hasConstraint(id: Id): boolean {
    return this.constraints.has(id);
  }

  /** @internal — consumed by World.patchConstraint. */
  getConstraintSpec(id: Id): ConstraintSpec | undefined {
    return this.constraints.get(id)?.spec;
  }

  applyConstraintSpec(id: Id, next: ConstraintSpec): void {
    const rec = this.constraints.get(id);
    if (!rec || rec.spec.kind !== next.kind) return;
    const prev = rec.spec;
    if (next.kind === "spring") {
      if (springAnchorsMatch(prev as SpringSpec, next)) {
        const dj = rec.joints[0] as planck.DistanceJoint;
        dj.setLength(next.restLength ?? dj.getLength());
        dj.setFrequency(next.frequencyHz ?? dj.getFrequency());
        dj.setDampingRatio(next.dampingRatio ?? dj.getDampingRatio());
        this.constraints.set(id, { ...rec, spec: next });
        return;
      }
      this.replaceConstraintKeepingId(id, next);
      return;
    }
    if (next.kind === "rope") {
      if (!ropeRebuildNeeded(prev as RopeSpec, next as RopeSpec)) return;
      this.replaceConstraintKeepingId(id, next);
      return;
    }
    if (next.kind === "hinge") {
      const ha = prev as HingeSpec;
      const hb = next;
      if (
        ha.bodyA === hb.bodyA &&
        ha.bodyB === hb.bodyB &&
        ha.worldAnchor.x === hb.worldAnchor.x &&
        ha.worldAnchor.y === hb.worldAnchor.y
      ) {
        return;
      }
      this.replaceConstraintKeepingId(id, next);
      return;
    }
    if (next.kind === "pulley") {
      const pa = prev as PulleySpec;
      const pb = next;
      if (pulleySpecsEquivalent(pa, pb)) return;
      this.replaceConstraintKeepingId(id, next);
    }
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
            angle: record.body.getAngle(),
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

function pulleySpecsEquivalent(a: PulleySpec, b: PulleySpec): boolean {
  const hsA = a.halfSpread ?? PULLEY_DEFAULT_HALF_SPREAD;
  const hsB = b.halfSpread ?? PULLEY_DEFAULT_HALF_SPREAD;
  return (
    a.bodyA === b.bodyA &&
    a.bodyB === b.bodyB &&
    a.wheelCenter.x === b.wheelCenter.x &&
    a.wheelCenter.y === b.wheelCenter.y &&
    a.localAnchorA.x === b.localAnchorA.x &&
    a.localAnchorA.y === b.localAnchorA.y &&
    a.localAnchorB.x === b.localAnchorB.x &&
    a.localAnchorB.y === b.localAnchorB.y &&
    hsA === hsB &&
    (a.ratio ?? 1) === (b.ratio ?? 1)
  );
}

function fixturesNeedRebuild(oldS: BodySpec, newS: BodySpec): boolean {
  if (oldS.kind !== newS.kind) return true;
  const matOld = oldS.material ?? "wood";
  const matNew = newS.material ?? "wood";
  if (matOld !== matNew) return true;
  if ((oldS.fixtureFriction ?? null) !== (newS.fixtureFriction ?? null)) return true;
  if ((oldS.fixtureRestitution ?? null) !== (newS.fixtureRestitution ?? null)) return true;
  if (oldS.kind === "ball" && newS.kind === "ball") {
    if (oldS.radius !== newS.radius) return true;
    if ((oldS.collideWithBalls ?? true) !== (newS.collideWithBalls ?? true)) return true;
  }
  if (oldS.kind === "box" && newS.kind === "box") {
    if (oldS.width !== newS.width || oldS.height !== newS.height) return true;
  }
  if (oldS.kind === "magnet" && newS.kind === "magnet") {
    if (oldS.radius !== newS.radius) return true;
  }
  return false;
}

function rebuildBodyFixtures(body: planck.Body, spec: BodySpec): void {
  let f = body.getFixtureList();
  while (f) {
    const nextF = f.getNext();
    body.destroyFixture(f);
    f = nextF;
  }
  const material = lookupMaterial(spec.material);
  const shape = makeShape(spec);
  const filter = collisionFilter(spec);
  body.createFixture({
    shape,
    density: material.density,
    friction: spec.fixtureFriction ?? material.friction,
    restitution: spec.fixtureRestitution ?? material.restitution,
    ...(filter ?? {}),
  });
}

/** Collision filter for body fixtures (rope links use their own bits). */
function collisionFilter(
  spec: BodySpec,
): { filterCategoryBits: number; filterMaskBits: number } | undefined {
  if (spec.kind !== "ball") return undefined;
  if (spec.fixed) return undefined;
  if (spec.collideWithBalls !== false) return undefined;
  const cat = CAT_NO_DYNAMIC_BALL_COLLISION;
  return {
    filterCategoryBits: cat,
    filterMaskBits: 0xffff ^ cat,
  };
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
      nominalLength: spec.length,
      segmentLinks: record.internalBodies.length,
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
    const restLength = joint.getLength();
    return Object.freeze({
      id,
      kind: "spring" as const,
      a: Object.freeze({ x: a.x, y: a.y }),
      b: Object.freeze({ x: b.x, y: b.y }),
      restLength,
      currentLength: Math.hypot(dx, dy),
      frequencyHz: joint.getFrequency(),
      dampingRatio: joint.getDampingRatio(),
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
    linearDamping: spec.linearDamping ?? 0,
    angularDamping: spec.angularDamping ?? 0,
  } as const;

  if (spec.kind === "ball") {
    return Object.freeze({
      ...base,
      kind: "ball" as const,
      radius: spec.radius,
      collideDynamicBalls: spec.collideWithBalls !== false,
    });
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
