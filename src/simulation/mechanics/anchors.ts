import type { Anchor, Id, Vec2 } from "../core/types";

export function worldAnchor(point: Vec2): Anchor {
  return { kind: "world", point };
}

export function bodyAnchor(id: Id, localPoint?: Vec2): Anchor {
  return localPoint
    ? { kind: "body", id, localPoint }
    : { kind: "body", id };
}
