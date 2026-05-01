import * as planck from "planck";
import type { SimulationConfig } from "../core/config";
import type {
  Anchor,
  BeltSpec,
  BodySpec,
  BodyView,
  ChargedSourceView,
  ConstraintSpec,
  ConstraintView,
  EngineRotorSpec,
  EngineSpec,
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
import type { BuoyantBodyState } from "../mechanics/buoyancy";
import {
  beltDisplayPath,
  effectivePulleyRadiusFromSpec,
} from "../core/beltGeometry";
import { PULLEY_DEFAULT_HALF_SPREAD } from "../mechanics/pulley";

const PULLEY_MIN_HALF_SPREAD = 0.05;

const ORIENTED_BOX_MINY_EPS = 1e-12;

/** Minimum world Y over box corners (horizontal floor: keep this when width/height change). */
function orientedBoxMinWorldY(
  cy: number,
  angle: number,
  width: number,
  height: number,
): number {
  const hw = width / 2;
  const hh = height / 2;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  let minY = Infinity;
  for (const sx of [-1, 1] as const) {
    for (const sy of [-1, 1] as const) {
      const lx = sx * hw;
      const ly = sy * hh;
      const y = cy + s * lx + c * ly;
      if (y < minY) minY = y;
    }
  }
  return minY;
}

/** Dynamic balls that ghost through each other (Galton marbles); still collide with default fixtures & rope links. */
const CAT_NO_DYNAMIC_BALL_COLLISION = 0x0010;

interface BodyRecord {
  readonly id: Id;
  readonly spec: BodySpec;
  readonly body: planck.Body;
}

interface EngineAssembly {
  readonly housingId: Id;
  readonly rotorId: Id;
  readonly joint: planck.RevoluteJoint;
  spec: EngineSpec;
}

type DragJoint = {
  readonly kind: "joint";
  readonly id: Id;
  readonly joint: planck.MouseJoint;
};

type DragTeleport = {
  readonly kind: "teleport";
  readonly id: Id;
  /** Grab point on the body in local space (`getLocalPoint` at drag start). */
  readonly localGrab: planck.Vec2;
};

type DragRotate = {
  readonly kind: "rotate";
  readonly id: Id;
  readonly startPointerAngle: number;
  readonly startBodyAngle: number;
};

type DragState = DragJoint | DragTeleport | DragRotate;

interface ConstraintRecord {
  readonly id: Id;
  readonly spec: ConstraintSpec;
  readonly internalBodies: planck.Body[];
  readonly joints: planck.Joint[];
  /** Belt: `joints[1]` is a ground revolute we created for the driven body. */
  readonly beltOwnsDrivenPivot?: boolean;
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
  private readonly engineAssemblies = new Map<Id, EngineAssembly>();
  /** Maps any engine body id (housing or rotor) to housing (assembly key). */
  private readonly engineHousingOf = new Map<Id, Id>();
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
    if (spec.kind === "engine") {
      throw new Error("PlanckAdapter.add: use addEnginePair for engine specs");
    }
    if (spec.kind === "engine_rotor") {
      throw new Error("PlanckAdapter.add: engine_rotor is created with addEnginePair only");
    }
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

  addEnginePair(housingId: Id, rotorId: Id, spec: EngineSpec): void {
    if (this.bodies.has(housingId) || this.bodies.has(rotorId)) {
      throw new Error("PlanckAdapter.addEnginePair: body id already exists");
    }
    const material = lookupMaterial(spec.material);
    const housingBody = this.world.createBody({
      type: spec.fixed ? "static" : "dynamic",
      position: planck.Vec2(spec.position.x, spec.position.y),
      angle: spec.angle ?? 0,
      linearVelocity: spec.velocity
        ? planck.Vec2(spec.velocity.x, spec.velocity.y)
        : planck.Vec2(0, 0),
      angularVelocity: spec.angularVelocity ?? 0,
      userData: housingId,
      linearDamping: spec.linearDamping ?? 0,
      angularDamping: spec.angularDamping ?? 0,
    });
    housingBody.createFixture({
      shape: new planck.BoxShape(spec.width / 2, spec.height / 2),
      density: material.density,
      friction: spec.fixtureFriction ?? material.friction,
      restitution: spec.fixtureRestitution ?? material.restitution,
    });

    const rotorBody = this.world.createBody({
      type: "dynamic",
      position: planck.Vec2(spec.position.x, spec.position.y),
      angle: spec.angle ?? 0,
      linearVelocity: spec.velocity
        ? planck.Vec2(spec.velocity.x, spec.velocity.y)
        : planck.Vec2(0, 0),
      angularVelocity: spec.angularVelocity ?? 0,
      userData: rotorId,
      linearDamping: spec.linearDamping ?? 0,
      angularDamping: spec.angularDamping ?? 0,
    });
    const rotorSpec: EngineRotorSpec = {
      kind: "engine_rotor",
      position: spec.position,
      angle: spec.angle ?? 0,
      velocity: spec.velocity,
      angularVelocity: spec.angularVelocity,
      fixed: false,
      material: spec.material ?? "metal",
      housingId,
      radius: spec.rotorRadius,
      linearDamping: spec.linearDamping ?? 0,
      angularDamping: spec.angularDamping ?? 0,
      buoyancyScale: spec.buoyancyScale ?? 1,
      buoyancyLift: spec.buoyancyLift ?? 0,
      charge: 0,
      ...(spec.fixtureRestitution !== undefined
        ? { fixtureRestitution: spec.fixtureRestitution }
        : {}),
      ...(spec.fixtureFriction !== undefined ? { fixtureFriction: spec.fixtureFriction } : {}),
    };
    rotorBody.createFixture({
      shape: new planck.CircleShape(spec.rotorRadius),
      density: material.density,
      friction: spec.fixtureFriction ?? material.friction,
      restitution: spec.fixtureRestitution ?? material.restitution,
    });

    const anchor = planck.Vec2(spec.position.x, spec.position.y);
    const joint = new planck.RevoluteJoint(
      { collideConnected: false },
      housingBody,
      rotorBody,
      anchor,
    );
    this.world.createJoint(joint);

    this.bodies.set(housingId, { id: housingId, spec, body: housingBody });
    this.bodies.set(rotorId, { id: rotorId, spec: rotorSpec, body: rotorBody });
    this.engineAssemblies.set(housingId, {
      housingId,
      rotorId,
      joint,
      spec,
    });
    this.engineHousingOf.set(housingId, housingId);
    this.engineHousingOf.set(rotorId, housingId);
  }

  /** If `id` is an engine housing or its rotor, returns the housing id. */
  resolveEngineHousingId(id: Id): Id | null {
    return this.engineHousingOf.get(id) ?? null;
  }

  /** Removes revolute joint and both bodies. */
  removeEngineAssembly(housingId: Id): Id[] {
    const asm = this.engineAssemblies.get(housingId);
    if (!asm) return [];
    if (
      this.dragState?.id === asm.housingId ||
      this.dragState?.id === asm.rotorId
    ) {
      this.endDrag();
    }
    this.removeConstraintsReferencingIds(
      new Set([asm.housingId, asm.rotorId]),
    );
    this.world.destroyJoint(asm.joint);
    const hRec = this.bodies.get(asm.housingId);
    const rRec = this.bodies.get(asm.rotorId);
    if (hRec) this.world.destroyBody(hRec.body);
    if (rRec) this.world.destroyBody(rRec.body);
    this.bodies.delete(asm.housingId);
    this.bodies.delete(asm.rotorId);
    this.engineAssemblies.delete(housingId);
    this.engineHousingOf.delete(asm.housingId);
    this.engineHousingOf.delete(asm.rotorId);
    return [asm.housingId, asm.rotorId];
  }

  private syncEngineRotorWithHousing(asm: EngineAssembly, housingSpec: EngineSpec): void {
    const rRec = this.bodies.get(asm.rotorId);
    if (!rRec || rRec.spec.kind !== "engine_rotor") return;
    const oldR = rRec.spec;
    const newR: EngineRotorSpec = {
      ...oldR,
      radius: housingSpec.rotorRadius,
      material: housingSpec.material ?? "metal",
      linearDamping: housingSpec.linearDamping ?? 0,
      angularDamping: housingSpec.angularDamping ?? 0,
      buoyancyScale: housingSpec.buoyancyScale ?? 1,
      buoyancyLift: housingSpec.buoyancyLift ?? 0,
      ...(housingSpec.fixtureRestitution !== undefined
        ? { fixtureRestitution: housingSpec.fixtureRestitution }
        : {}),
      ...(housingSpec.fixtureFriction !== undefined
        ? { fixtureFriction: housingSpec.fixtureFriction }
        : {}),
    };
    const matOld = oldR.material ?? "wood";
    const matNew = newR.material ?? "wood";
    const needRebuild =
      oldR.radius !== newR.radius ||
      matOld !== matNew ||
      (oldR.fixtureFriction ?? null) !== (newR.fixtureFriction ?? null) ||
      (oldR.fixtureRestitution ?? null) !== (newR.fixtureRestitution ?? null);
    if (needRebuild) {
      rebuildBodyFixtures(rRec.body, newR);
    }
    rRec.body.setLinearDamping(newR.linearDamping ?? 0);
    rRec.body.setAngularDamping(newR.angularDamping ?? 0);
    this.bodies.set(asm.rotorId, { id: asm.rotorId, spec: newR, body: rRec.body });
  }
  getBodySpec(id: Id): BodySpec | undefined {
    const record = this.bodies.get(id);
    if (!record) return undefined;
    const b = record.body;
    const bp = b.getPosition();
    const v = b.getLinearVelocity();
    return {
      ...record.spec,
      position: { x: bp.x, y: bp.y },
      angle: b.getAngle(),
      velocity: { x: v.x, y: v.y },
      angularVelocity: b.getAngularVelocity(),
    };
  }

  /**
   * Apply a full next spec to an existing body (pose and velocities unchanged).
   * Kind must match the existing body.
   *
   * Resizing while resting on a horizontal surface: preserve the lowest **world
   * Y** hull point (box corners or circle bottom) so edits to `width` / `height`
   * / `radius` don’t sink through the floor — not only `height` along body
   * local +Y (which fails once the box is rotated). Defers via `queueUpdate`
   * when the Planck world is locked mid-step.
   */
  applyBodySpec(
    id: Id,
    nextSpec: BodySpec,
    opts?: { readonly skipBottomAnchor?: boolean },
  ): void {
    const run = () => this.applyBodySpecNow(id, nextSpec, opts);
    if (this.world.isLocked()) {
      this.world.queueUpdate(run);
    } else {
      run();
    }
  }

  private applyBodySpecNow(
    id: Id,
    nextSpec: BodySpec,
    opts?: { readonly skipBottomAnchor?: boolean },
  ): void {
    const record = this.bodies.get(id);
    if (!record) return;
    if (record.spec.kind === "engine_rotor") return;
    const oldSpec = record.spec;
    if (oldSpec.kind !== nextSpec.kind) {
      throw new Error(`applyBodySpec: kind ${oldSpec.kind} cannot become ${nextSpec.kind}`);
    }

    if (this.dragState?.id === id && (nextSpec.fixed ?? false)) this.endDrag();

    const body = record.body;

    let resolvedSpec = nextSpec;
    if (!opts?.skipBottomAnchor) {
      const bp = body.getPosition();
      const bx = bp.x;
      const by = bp.y;
      const angleOld = body.getAngle();
      const angleNew = nextSpec.angle ?? angleOld;

      if (
        (oldSpec.kind === "box" && nextSpec.kind === "box") ||
        (oldSpec.kind === "engine" && nextSpec.kind === "engine")
      ) {
        const dimChanged =
          nextSpec.width !== oldSpec.width ||
          nextSpec.height !== oldSpec.height;
        if (dimChanged) {
          const oldMinY = orientedBoxMinWorldY(
            by,
            angleOld,
            oldSpec.width,
            oldSpec.height,
          );
          const newMinY = orientedBoxMinWorldY(
            by,
            angleNew,
            nextSpec.width,
            nextSpec.height,
          );
          const dy = oldMinY - newMinY;
          if (Math.abs(dy) > ORIENTED_BOX_MINY_EPS) {
            resolvedSpec = {
              ...nextSpec,
              position: { x: bx, y: by + dy },
            };
          }
        }
      } else if (
        (oldSpec.kind === "ball" && nextSpec.kind === "ball") ||
        (oldSpec.kind === "balloon" && nextSpec.kind === "balloon") ||
        (oldSpec.kind === "magnet" && nextSpec.kind === "magnet") ||
        (oldSpec.kind === "crank" && nextSpec.kind === "crank")
      ) {
        if (nextSpec.radius !== oldSpec.radius) {
          const oldMinY = by - oldSpec.radius;
          const newMinY = by - nextSpec.radius;
          const dy = oldMinY - newMinY;
          if (Math.abs(dy) > ORIENTED_BOX_MINY_EPS) {
            resolvedSpec = {
              ...nextSpec,
              position: { x: bx, y: by + dy },
            };
          }
        }
      }
    }

    const rebuild = fixturesNeedRebuild(oldSpec, resolvedSpec);
    const fixedChanged = (oldSpec.fixed ?? false) !== (resolvedSpec.fixed ?? false);

    if (rebuild) {
      rebuildBodyFixtures(body, resolvedSpec);
    }

    if (fixedChanged) {
      if (resolvedSpec.fixed) {
        body.setStatic();
        body.setLinearVelocity(planck.Vec2(0, 0));
        body.setAngularVelocity(0);
      } else {
        body.setDynamic();
      }
    }

    body.setLinearDamping(resolvedSpec.linearDamping ?? 0);
    body.setAngularDamping(resolvedSpec.angularDamping ?? 0);

    const curP = body.getPosition();
    const curA = body.getAngle();
    const wantA = resolvedSpec.angle ?? 0;
    const poseEps = 1e-5;
    const poseMoved =
      Math.abs(resolvedSpec.position.x - curP.x) > poseEps ||
      Math.abs(resolvedSpec.position.y - curP.y) > poseEps ||
      Math.abs(wantA - curA) > poseEps;

    let outSpec = resolvedSpec;
    if (poseMoved) {
      body.setTransform(
        planck.Vec2(resolvedSpec.position.x, resolvedSpec.position.y),
        wantA,
      );
      body.setLinearVelocity(planck.Vec2(0, 0));
      body.setAngularVelocity(0);
      outSpec = {
        ...resolvedSpec,
        velocity: { x: 0, y: 0 },
        angularVelocity: 0,
      };
      if (oldSpec.kind === "engine" && outSpec.kind === "engine") {
        const asm = this.engineAssemblies.get(id);
        if (asm) {
          const rBody = this.bodies.get(asm.rotorId)!.body;
          rBody.setTransform(
            planck.Vec2(resolvedSpec.position.x, resolvedSpec.position.y),
            wantA,
          );
          rBody.setLinearVelocity(planck.Vec2(0, 0));
          rBody.setAngularVelocity(0);
        }
      }
    }

    this.bodies.set(id, { id, spec: outSpec, body });

    if (outSpec.kind === "engine") {
      const asm = this.engineAssemblies.get(id);
      if (asm) {
        asm.spec = outSpec;
        this.syncEngineRotorWithHousing(asm, outSpec);
      }
    }
  }

  remove(id: Id): void {
    const hid = this.engineHousingOf.get(id);
    if (hid !== undefined) {
      this.removeEngineAssembly(hid);
      return;
    }
    const record = this.bodies.get(id);
    if (!record) return;
    if (this.dragState?.id === id) this.endDrag();
    this.removeConstraintsReferencingIds(new Set([id]));
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

  /**
   * Static / kinematic bodies whose fixtures contain `p`. Used after
   * `findDynamicBodyAt` for selection and connector anchors; not draggable.
   */
  findNonDynamicBodyAt(p: Vec2): Id | null {
    const eps = 1e-3;
    const aabb = new planck.AABB(
      planck.Vec2(p.x - eps, p.y - eps),
      planck.Vec2(p.x + eps, p.y + eps),
    );
    let foundId: Id | null = null;
    const target = planck.Vec2(p.x, p.y);
    this.world.queryAABB(aabb, (fixture) => {
      const body = fixture.getBody();
      if (body.isDynamic()) return true;
      if (body === this.groundBody) return true;
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

  startDrag(id: Id, target: Vec2, opts: { teleport: boolean; rotate: boolean }): boolean {
    const record = this.bodies.get(id);
    if (!record) return false;
    if (!record.body.isDynamic()) return false;
    if (this.dragState) this.endDrag();

    record.body.setAwake(true);

    if (opts.rotate) {
      const pivot = record.body.getPosition();
      const startPointerAngle = Math.atan2(
        target.y - pivot.y,
        target.x - pivot.x,
      );
      this.dragState = {
        kind: "rotate",
        id,
        startPointerAngle,
        startBodyAngle: record.body.getAngle(),
      };
      return true;
    }

    if (opts.teleport) {
      const lp = record.body.getLocalPoint(planck.Vec2(target.x, target.y));
      this.dragState = {
        kind: "teleport",
        id,
        localGrab: planck.Vec2.clone(lp),
      };
      return true;
    }

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
    this.dragState = { kind: "joint", id, joint };
    return true;
  }

  updateDrag(target: Vec2): void {
    if (!this.dragState) return;
    const record = this.bodies.get(this.dragState.id);
    if (!record) return;
    const body = record.body;

    if (this.dragState.kind === "joint") {
      this.dragState.joint.setTarget(planck.Vec2(target.x, target.y));
      return;
    }
    if (this.dragState.kind === "teleport") {
      const a = body.getAngle();
      const lx = this.dragState.localGrab.x;
      const ly = this.dragState.localGrab.y;
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      const ox = cos * lx - sin * ly;
      const oy = sin * lx + cos * ly;
      body.setPosition(planck.Vec2(target.x - ox, target.y - oy));
      body.setLinearVelocity(planck.Vec2(0, 0));
      body.setAngularVelocity(0);
      return;
    }

    const pivot = body.getPosition();
    const ptr = Math.atan2(target.y - pivot.y, target.x - pivot.x);
    let delta = ptr - this.dragState.startPointerAngle;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    body.setAngle(this.dragState.startBodyAngle + delta);
    body.setLinearVelocity(planck.Vec2(0, 0));
    body.setAngularVelocity(0);
  }

  endDrag(): void {
    if (!this.dragState) return;
    if (this.dragState.kind === "joint") {
      this.world.destroyJoint(this.dragState.joint);
    }
    const id = this.dragState.id;
    this.dragState = null;
    this.syncRecordedSpecPoseFromBody(id);
  }

  /** Keeps authoritative `spec` aligned with Planck state after gestures. */
  private syncRecordedSpecPoseFromBody(id: Id): void {
    const record = this.bodies.get(id);
    if (!record) return;
    const bp = record.body.getPosition();
    const v = record.body.getLinearVelocity();
    this.bodies.set(id, {
      id,
      body: record.body,
      spec: {
        ...record.spec,
        position: { x: bp.x, y: bp.y },
        angle: record.body.getAngle(),
        velocity: { x: v.x, y: v.y },
        angularVelocity: record.body.getAngularVelocity(),
      },
    });
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

  /**
   * Dynamic bodies eligible for ambient-fluid buoyancy and drag.
   * Excludes kinematic/static; stable iteration order is imposed by callers.
   */
  collectBuoyantBodies(): BuoyantBodyState[] {
    const out: BuoyantBodyState[] = [];
    for (const [id, record] of this.bodies) {
      if (!record.body.isDynamic()) continue;
      const spec = record.spec;
      let displacedArea = 0;
      if (spec.kind === "ball" || spec.kind === "balloon" || spec.kind === "magnet") {
        displacedArea = Math.PI * spec.radius * spec.radius;
      } else if (spec.kind === "engine_rotor" || spec.kind === "crank") {
        displacedArea = Math.PI * spec.radius * spec.radius;
      } else {
        displacedArea = spec.width * spec.height;
      }
      const v = record.body.getLinearVelocity();
      out.push({
        id,
        velocity: { x: v.x, y: v.y },
        displacedArea,
        buoyancyScale: spec.buoyancyScale ?? 1,
        buoyancyLift: spec.buoyancyLift ?? 0,
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

  /**
   * Motor bodies eligible for per-substep drive torque. `active` is false for
   * static/kinematic bodies and when `fixed` is true.
   */
  engineTorqueInputs(): ReadonlyArray<{
    readonly id: Id;
    readonly torque: number;
    readonly active: boolean;
  }> {
    const out: Array<{ readonly id: Id; readonly torque: number; readonly active: boolean }> =
      [];
    for (const asm of this.engineAssemblies.values()) {
      const rotorRec = this.bodies.get(asm.rotorId);
      if (!rotorRec) continue;
      out.push({
        id: asm.rotorId,
        torque: asm.spec.torque,
        active: rotorRec.body.isDynamic(),
      });
    }
    return out;
  }

  private constraintReferencesAnyId(spec: ConstraintSpec, ids: Set<Id>): boolean {
    if (spec.kind === "belt") {
      return ids.has(spec.driverRotorId) || ids.has(spec.drivenBodyId);
    }
    if (spec.kind === "pulley") {
      return ids.has(spec.bodyA) || ids.has(spec.bodyB);
    }
    if (spec.kind === "hinge") {
      return ids.has(spec.bodyA) ||
        (spec.bodyB !== undefined && ids.has(spec.bodyB));
    }
    if (spec.kind === "rope" || spec.kind === "spring") {
      const hit = (a: Anchor) => a.kind === "body" && ids.has(a.id);
      return hit(spec.a) || hit(spec.b);
    }
    const exhaustive: never = spec;
    void exhaustive;
    return false;
  }

  private removeConstraintsReferencingIds(ids: Set<Id>): void {
    const toRemove: Id[] = [];
    for (const [cid, rec] of this.constraints) {
      if (this.constraintReferencesAnyId(rec.spec, ids)) {
        toRemove.push(cid);
      }
    }
    for (const cid of toRemove) {
      const rec = this.constraints.get(cid);
      if (!rec) continue;
      this.disposeConstraintRecord(rec);
      this.constraints.delete(cid);
    }
  }

  private disposeConstraintRecord(record: ConstraintRecord): void {
    if (record.spec.kind === "belt") {
      const gear = record.joints[0];
      if (gear) this.world.destroyJoint(gear);
      if (record.beltOwnsDrivenPivot) {
        const aux = record.joints[1];
        if (aux) this.world.destroyJoint(aux);
      }
      // Restore the default sleep behaviour suppressed in `buildBelt`.
      const drivenRec = this.bodies.get(record.spec.drivenBodyId);
      if (drivenRec) drivenRec.body.setSleepingAllowed(true);
      return;
    }
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
    if (spec.kind === "belt") {
      this.constraints.set(id, this.buildBelt(id, spec));
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
      return;
    }
    if (next.kind === "belt") {
      const pa = prev as BeltSpec;
      const pb = next;
      if (
        pa.driverRotorId === pb.driverRotorId &&
        pa.drivenBodyId === pb.drivenBodyId &&
        (pa.ratio ?? null) === (pb.ratio ?? null)
      ) {
        return;
      }
      if (
        pa.driverRotorId === pb.driverRotorId &&
        pa.drivenBodyId === pb.drivenBodyId
      ) {
        const gj = rec.joints[0] as planck.GearJoint;
        gj.setRatio(resolveBeltGearRatio(pb, this.bodies));
        this.constraints.set(id, { ...rec, spec: pb });
        return;
      }
      this.replaceConstraintKeepingId(id, pb);
      return;
    }
  }

  buildSnapshot(tick: number, time: number): Snapshot {
    const ids = Array.from(this.bodies.keys()).sort((a, b) => a - b);
    const bodies: BodyView[] = ids.map((id) => {
      const record = this.bodies.get(id)!;
      return buildView(record, this.engineAssemblies);
    });

    const constraintIds = Array.from(this.constraints.keys()).sort(
      (a, b) => a - b,
    );
    const constraints: ConstraintView[] = constraintIds.map((id) => {
      const record = this.constraints.get(id)!;
      return buildConstraintView(record, this.bodies);
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
    // Box2D's GearJoint reads its dynamic body as `joint.getBodyB()` of the
    // child revolute. Order the revolute so a static / ground body sits on
    // bodyA, otherwise a belt that later reuses this hinge will couple to
    // the static side and the dynamic body never spins.
    const aIsStatic = !recordA.body.isDynamic();
    const bIsStatic = !bodyB.isDynamic();
    const [first, second] =
      aIsStatic && !bIsStatic ? [recordA.body, bodyB]
      : !aIsStatic && bIsStatic ? [bodyB, recordA.body]
      : [recordA.body, bodyB];
    const joint = new planck.RevoluteJoint(
      {},
      first,
      second,
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

  /**
   * Find any revolute joint that pins this body against a static (or ground)
   * counterpart — usable as `joint2` for a GearJoint. Box2D's GearJoint reads
   * its dynamic side from `joint2.getBodyB()`, so we only return revolutes
   * where the counterpart on `getBodyA()` is the static one (the hinge
   * factory orders its joints that way).
   */
  private findRevoluteToStatic(body: planck.Body): planck.RevoluteJoint | null {
    for (let e = body.getJointList(); e; e = e.next) {
      const j = e.joint;
      if (j === null || j.getType() !== planck.RevoluteJoint.TYPE) continue;
      const rj = j as planck.RevoluteJoint;
      const a = rj.getBodyA();
      const b = rj.getBodyB();
      // We want body to be on the dynamic (B) side and the other body static.
      if (b !== body) continue;
      if (a === this.groundBody || !a.isDynamic()) {
        return rj;
      }
    }
    return null;
  }

  private buildBelt(id: Id, spec: BeltSpec): ConstraintRecord {
    const rotorRec = this.bodies.get(spec.driverRotorId);
    const drivenRec = this.bodies.get(spec.drivenBodyId);
    if (!rotorRec) {
      throw new Error(`belt: driver rotor id ${spec.driverRotorId} not found`);
    }
    if (rotorRec.spec.kind !== "engine_rotor") {
      throw new Error("belt: driver must be an engine flywheel (engine_rotor)");
    }
    if (!drivenRec) {
      throw new Error(`belt: driven body id ${spec.drivenBodyId} not found`);
    }
    if (!drivenRec.body.isDynamic()) {
      throw new Error("belt: driven body must be dynamic");
    }
    const housingId = this.engineHousingOf.get(spec.driverRotorId);
    if (housingId === undefined) {
      throw new Error("belt: driver is not part of an engine assembly");
    }
    const asm = this.engineAssemblies.get(housingId);
    if (!asm || asm.rotorId !== spec.driverRotorId) {
      throw new Error("belt: engine assembly mismatch");
    }

    let drivenRevolute = this.findRevoluteToStatic(drivenRec.body);
    let ownsPivot = false;
    if (!drivenRevolute) {
      const p = drivenRec.body.getPosition();
      const anchor = planck.Vec2(p.x, p.y);
      drivenRevolute = new planck.RevoluteJoint(
        { collideConnected: false },
        this.groundBody,
        drivenRec.body,
        anchor,
      );
      this.world.createJoint(drivenRevolute);
      ownsPivot = true;
    }

    const ratio = resolveBeltGearRatio(spec, this.bodies);
    const gear = new planck.GearJoint(
      { collideConnected: false },
      rotorRec.body,
      drivenRec.body,
      asm.joint,
      drivenRevolute,
      ratio,
    );
    this.world.createJoint(gear);

    // Box2D auto-sleeps idle bodies, but it does not propagate wake through
    // a GearJoint. Without this, the driven body sleeps a few frames after
    // creation and the engine's torque can no longer move it. Both ends of
    // the belt must therefore stay awake while the assembly exists.
    rotorRec.body.setSleepingAllowed(false);
    rotorRec.body.setAwake(true);
    drivenRec.body.setSleepingAllowed(false);
    drivenRec.body.setAwake(true);

    const joints = ownsPivot ? [gear, drivenRevolute] : [gear];
    return {
      id,
      spec,
      internalBodies: [],
      joints,
      ...(ownsPivot ? { beltOwnsDrivenPivot: true as const } : {}),
    };
  }
}

function resolveBeltGearRatio(spec: BeltSpec, bodies: Map<Id, BodyRecord>): number {
  if (
    spec.ratio !== undefined &&
    Number.isFinite(spec.ratio) &&
    Math.abs(spec.ratio) > 1e-9
  ) {
    return spec.ratio;
  }
  const rotorRec = bodies.get(spec.driverRotorId);
  const drivenRec = bodies.get(spec.drivenBodyId);
  if (!rotorRec || !drivenRec) return -1;
  const rDr = effectivePulleyRadiusFromSpec(rotorRec.spec);
  const rDn = effectivePulleyRadiusFromSpec(drivenRec.spec);
  return -(rDn / Math.max(rDr, 1e-6));
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
  if (oldS.kind === "crank" && newS.kind === "crank") {
    if (oldS.radius !== newS.radius) return true;
    if ((oldS.collideWithBalls ?? true) !== (newS.collideWithBalls ?? true)) return true;
  }
  if (oldS.kind === "balloon" && newS.kind === "balloon") {
    if (oldS.radius !== newS.radius) return true;
    if ((oldS.collideWithBalls ?? true) !== (newS.collideWithBalls ?? true)) return true;
  }
  if (oldS.kind === "box" && newS.kind === "box") {
    if (oldS.width !== newS.width || oldS.height !== oldS.height) return true;
  }
  if (oldS.kind === "engine" && newS.kind === "engine") {
    if (
      oldS.width !== newS.width ||
      oldS.height !== newS.height ||
      oldS.rotorRadius !== newS.rotorRadius
    ) {
      return true;
    }
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
  if (spec.kind !== "ball" && spec.kind !== "balloon" && spec.kind !== "crank") {
    return undefined;
  }
  if (spec.fixed) return undefined;
  if (spec.collideWithBalls !== false) return undefined;
  const cat = CAT_NO_DYNAMIC_BALL_COLLISION;
  return {
    filterCategoryBits: cat,
    filterMaskBits: 0xffff ^ cat,
  };
}

function makeShape(spec: BodySpec): planck.Shape {
  if (spec.kind === "ball" || spec.kind === "balloon" || spec.kind === "crank") {
    return new planck.CircleShape(spec.radius);
  }
  if (spec.kind === "magnet") {
    return new planck.CircleShape(spec.radius);
  }
  if (spec.kind === "engine_rotor") {
    return new planck.CircleShape(spec.radius);
  }
  if (spec.kind === "engine") {
    return new planck.BoxShape(spec.width / 2, spec.height / 2);
  }
  return new planck.BoxShape(spec.width / 2, spec.height / 2);
}

function buildConstraintView(
  record: ConstraintRecord,
  bodies: Map<Id, BodyRecord>,
): ConstraintView {
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

  if (spec.kind === "belt") {
    const rotorRec = bodies.get(spec.driverRotorId);
    const drivenRec = bodies.get(spec.drivenBodyId);
    const gj = record.joints[0] as planck.GearJoint;
    const ratio = gj.getRatio();
    if (!rotorRec || !drivenRec) {
      return Object.freeze({
        id,
        kind: "belt" as const,
        path: Object.freeze([]),
        driverRotorId: spec.driverRotorId,
        drivenBodyId: spec.drivenBodyId,
        ratio,
      });
    }
    const p1 = rotorRec.body.getPosition();
    const p2 = drivenRec.body.getPosition();
    const r1 = effectivePulleyRadiusFromSpec(rotorRec.spec);
    const r2 = effectivePulleyRadiusFromSpec(drivenRec.spec);
    const raw = beltDisplayPath(
      { x: p1.x, y: p1.y },
      r1,
      { x: p2.x, y: p2.y },
      r2,
    );
    const path = raw.map((q) => Object.freeze({ x: q.x, y: q.y }));
    return Object.freeze({
      id,
      kind: "belt" as const,
      path: Object.freeze(path),
      driverRotorId: spec.driverRotorId,
      drivenBodyId: spec.drivenBodyId,
      ratio,
    });
  }

  const exhaustive: never = spec;
  throw new Error(
    `buildConstraintView: unknown kind ${(exhaustive as { kind: string }).kind}`,
  );
}

function buildView(
  record: BodyRecord,
  engineAssemblies: ReadonlyMap<Id, EngineAssembly>,
): BodyView {
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
    buoyancyScale: spec.buoyancyScale ?? 1,
    buoyancyLift: spec.buoyancyLift ?? 0,
  } as const;

  if (spec.kind === "ball") {
    return Object.freeze({
      ...base,
      kind: "ball" as const,
      radius: spec.radius,
      collideDynamicBalls: spec.collideWithBalls !== false,
    });
  }
  if (spec.kind === "balloon") {
    return Object.freeze({
      ...base,
      kind: "balloon" as const,
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
  if (spec.kind === "engine") {
    const asm = engineAssemblies.get(record.id);
    const rotorId = asm?.rotorId ?? record.id;
    return Object.freeze({
      ...base,
      kind: "engine" as const,
      width: spec.width,
      height: spec.height,
      rotorRadius: spec.rotorRadius,
      torque: spec.torque,
      rotorId,
    });
  }
  if (spec.kind === "engine_rotor") {
    const asm = engineAssemblies.get(spec.housingId);
    const torque = asm?.spec.torque ?? 0;
    return Object.freeze({
      ...base,
      kind: "engine_rotor" as const,
      radius: spec.radius,
      torque,
      housingId: spec.housingId,
    });
  }
  if (spec.kind === "crank") {
    return Object.freeze({
      ...base,
      kind: "crank" as const,
      radius: spec.radius,
      pinLocal: Object.freeze({ x: spec.pinLocal.x, y: spec.pinLocal.y }),
      collideDynamicBalls: spec.collideWithBalls !== false,
    });
  }
  if (spec.kind === "box") {
    return Object.freeze({
      ...base,
      kind: "box" as const,
      width: spec.width,
      height: spec.height,
    });
  }
  const _: never = spec;
  throw new Error(`buildView: unknown body kind ${(_ as { kind: string }).kind}`);
}
