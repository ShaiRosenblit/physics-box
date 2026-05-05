import type { Level } from "../types";
import { level1DropInBucket } from "./level1_dropInBucket";
import { level2MagneticCatch } from "./level2_magneticCatch";
import { level3CoulombCatch } from "./level3_coulombCatch";
import { level4PushOff } from "./level4_pushOff";

export const levels: readonly Level[] = [
  level1DropInBucket,
  level2MagneticCatch,
  level3CoulombCatch,
  level4PushOff,
];

export const levelById: Readonly<Record<string, Level>> = Object.fromEntries(
  levels.map((lv) => [lv.id, lv]),
);

export const defaultLevelId = level1DropInBucket.id;

export {
  level1DropInBucket,
  level2MagneticCatch,
  level3CoulombCatch,
  level4PushOff,
};
