import type { Level } from "../types";
import { level1DropInBucket } from "./level1_dropInBucket";
import { level2MagneticCatch } from "./level2_magneticCatch";
import { level3CoulombCatch } from "./level3_coulombCatch";
import { level4PushOff } from "./level4_pushOff";
import { level5StepUp } from "./level5_stepUp";
import { level6MagneticCrane } from "./level6_magneticCrane";
import { level7OverTheWall } from "./level7_overTheWall";
import { level8Rocket } from "./level8_rocket";
import { level9BalloonGate } from "./level9_balloonGate";
import { level10Seesaw } from "./level10_seesaw";
import { level11MagnetRelay } from "./level11_magnetRelay";
import { level12SpringCatapult } from "./level12_springCatapult";
import { level13CoulombBalance } from "./level13_coulombBalance";
import { level14TwoForOne } from "./level14_twoForOne";
import { level20PulleyLift } from "./level20_pulleyLift";
import { level21BumperBounce } from "./level21_bumperBounce";
import { level22MagnetPush } from "./level22_magnetPush";
import { level23WreckingBall } from "./level23_wreckingBall";
import { level24Trampoline } from "./level24_trampoline";
import { level90Tripwire } from "./level90_tripwire";

export const levels: readonly Level[] = [
  level1DropInBucket,
  level2MagneticCatch,
  level3CoulombCatch,
  level4PushOff,
  level5StepUp,
  level6MagneticCrane,
  level7OverTheWall,
  level8Rocket,
  level9BalloonGate,
  level10Seesaw,
  level11MagnetRelay,
  level12SpringCatapult,
  level13CoulombBalance,
  level14TwoForOne,
  level20PulleyLift,
  level21BumperBounce,
  level22MagnetPush,
  level23WreckingBall,
  level24Trampoline,
  level90Tripwire,
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
  level5StepUp,
  level6MagneticCrane,
  level7OverTheWall,
  level8Rocket,
  level9BalloonGate,
  level10Seesaw,
  level11MagnetRelay,
  level12SpringCatapult,
  level13CoulombBalance,
  level14TwoForOne,
  level20PulleyLift,
  level21BumperBounce,
  level22MagnetPush,
  level23WreckingBall,
  level24Trampoline,
  level90Tripwire,
};
