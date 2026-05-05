import type { Level } from "../types";
import { level1DropInBucket } from "./level1_dropInBucket";

export const levels: readonly Level[] = [level1DropInBucket];

export const levelById: Readonly<Record<string, Level>> = Object.fromEntries(
  levels.map((lv) => [lv.id, lv]),
);

export const defaultLevelId = level1DropInBucket.id;

export { level1DropInBucket };
