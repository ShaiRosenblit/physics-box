import { PULLEY_DEFAULT_HALF_SPREAD } from "../mechanics/pulley";
import type {
  BarSpec,
  BeltSpec,
  ConstraintPatch,
  ConstraintSpec,
  HingeSpec,
  PulleySpec,
  RopeSpec,
  SpringSpec,
  WeldSpec,
} from "./types";

export const MIN_CONNECTOR_REST = 0.05;
export const MIN_PULLEY_HALF_SPREAD = 0.05;
/** Minimum beaded-rope link count; `0` means a single rigid segment (see `RopeSpec.segments`). */
export const MIN_ROPE_SEGMENTS = 2;
/** @internal */
export function anchorEqual(a: RopeSpec["a"], b: RopeSpec["a"]): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "world") {
    return b.kind === "world" && b.point.x === a.point.x && b.point.y === a.point.y;
  }
  if (b.kind !== "body") return false;
  const la = a.localPoint ?? { x: 0, y: 0 };
  const lb = b.localPoint ?? { x: 0, y: 0 };
  return a.id === b.id && la.x === lb.x && la.y === lb.y;
}

export function mergeConstraintPatch(spec: ConstraintSpec, patch: ConstraintPatch): ConstraintSpec {
  switch (spec.kind) {
    case "rope": {
      let n = { ...spec };
      if (patch.length !== undefined) n = { ...n, length: patch.length };
      if (patch.segments !== undefined) n = { ...n, segments: patch.segments };
      if (patch.material !== undefined) n = { ...n, material: patch.material };
      return n;
    }
    case "spring": {
      let n: SpringSpec = { ...spec };
      if (patch.restLength !== undefined) n = { ...n, restLength: patch.restLength };
      if (patch.frequencyHz !== undefined) n = { ...n, frequencyHz: patch.frequencyHz };
      if (patch.dampingRatio !== undefined) n = { ...n, dampingRatio: patch.dampingRatio };
      return n;
    }
    case "hinge": {
      let n: HingeSpec = { ...spec };
      if (patch.worldAnchor !== undefined) {
        n = { ...n, worldAnchor: { ...patch.worldAnchor } };
      }
      return n;
    }
    case "pulley": {
      let n: PulleySpec = { ...spec };
      if (patch.halfSpread !== undefined) n = { ...n, halfSpread: patch.halfSpread };
      if (patch.ratio !== undefined) n = { ...n, ratio: patch.ratio };
      return n;
    }
    case "belt": {
      let n: BeltSpec = { ...spec };
      if (patch.ratio !== undefined) n = { ...n, ratio: patch.ratio };
      return n;
    }
    case "weld": {
      let n: WeldSpec = { ...spec };
      if (patch.worldAnchor !== undefined) {
        n = { ...n, worldAnchor: { ...patch.worldAnchor } };
      }
      return n;
    }
    case "bar": {
      let n: BarSpec = { ...spec };
      if (patch.barLength !== undefined) n = { ...n, length: patch.barLength };
      return n;
    }
    default: {
      const _e: never = spec;
      return _e;
    }
  }
}

export function sanitizeConstraintSpec(spec: ConstraintSpec): ConstraintSpec {
  if (spec.kind === "rope") {
    const len = Math.max(MIN_CONNECTOR_REST, spec.length);
    let seg = spec.segments;
    if (seg !== undefined) {
      const r = Math.round(seg);
      seg = r === 0 ? 0 : Math.max(MIN_ROPE_SEGMENTS, r);
    }
    const out: RopeSpec = { ...spec, length: len };
    return seg === undefined ? out : { ...out, segments: seg };
  }
  if (spec.kind === "spring") {
    const hz = Math.max(0, spec.frequencyHz ?? 4);
    const dr = Math.max(0, spec.dampingRatio ?? 0.5);
    const rl = Math.max(MIN_CONNECTOR_REST, spec.restLength ?? MIN_CONNECTOR_REST);
    return { ...spec, frequencyHz: hz, dampingRatio: dr, restLength: rl };
  }
  if (spec.kind === "pulley") {
    const hs = Math.max(
      MIN_PULLEY_HALF_SPREAD,
      spec.halfSpread ?? PULLEY_DEFAULT_HALF_SPREAD,
    );
    const ratio = Math.max(0.01, spec.ratio ?? 1);
    return { ...spec, halfSpread: hs, ratio };
  }
  if (spec.kind === "belt") {
    if (spec.ratio === undefined) return spec;
    const r = spec.ratio;
    if (!Number.isFinite(r) || Math.abs(r) < 1e-6) {
      const { ratio: _drop, ...rest } = spec;
      return { ...rest };
    }
    return spec;
  }
  if (spec.kind === "weld") return spec;
  if (spec.kind === "bar") {
    return { ...spec, length: Math.max(MIN_CONNECTOR_REST, spec.length) };
  }
  return spec;
}

export function springAnchorsMatch(a: SpringSpec, b: SpringSpec): boolean {
  return anchorEqual(a.a, b.a) && anchorEqual(a.b, b.b);
}

export function ropeRebuildNeeded(prev: RopeSpec, next: RopeSpec): boolean {
  return !anchorEqual(prev.a, next.a) ||
    !anchorEqual(prev.b, next.b) ||
    prev.segments !== next.segments ||
    (prev.material ?? "wood") !== (next.material ?? "wood") ||
    prev.length !== next.length;
}
