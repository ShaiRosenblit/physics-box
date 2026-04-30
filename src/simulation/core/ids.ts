import type { Id } from "./types";

export function createIdFactory(): () => Id {
  let next = 1;
  return () => next++ as Id;
}
