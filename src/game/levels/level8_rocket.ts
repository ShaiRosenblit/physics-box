import { ball, box } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 8 — Rocket.
 *
 * A positively charged marble rests at the bottom of a narrow vertical
 * channel. The bucket is directly above, at the top of the channel.
 * The player places positively charged balls below or beside the marble
 * to repel it straight up through the channel and into the bucket.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // Vertical channel guiding the marble upward.
  const channelX = 0;
  const channelHalfW = 0.35;
  const channelH = 8;
  const wallT = 0.15;

  // Left channel wall.
  world.add(
    box({
      position: { x: channelX - channelHalfW, y: channelH / 2 },
      width: wallT,
      height: channelH,
      fixed: true,
      material: "wood",
    }),
  );
  // Right channel wall.
  world.add(
    box({
      position: { x: channelX + channelHalfW, y: channelH / 2 },
      width: wallT,
      height: channelH,
      fixed: true,
      material: "wood",
    }),
  );

  // Positively charged marble at the bottom of the channel.
  const marbleId = world.add(
    ball({
      position: { x: channelX, y: 0.3 },
      radius: 0.15,
      material: "metal",
      charge: 3,
      angularDamping: 0.05,
      linearDamping: 0.03,
    }),
  );

  // Bucket at the top of the channel.
  const bucketCx = channelX;
  const bucketBaseY = channelH;
  const wallH = 1.0;
  const bucketHalfW = 0.55;
  const bucketWallT = 0.12;
  world.add(
    box({
      position: { x: bucketCx - bucketHalfW, y: bucketBaseY + wallH / 2 },
      width: bucketWallT,
      height: wallH,
      fixed: true,
      material: "wood",
    }),
  );
  world.add(
    box({
      position: { x: bucketCx + bucketHalfW, y: bucketBaseY + wallH / 2 },
      width: bucketWallT,
      height: wallH,
      fixed: true,
      material: "wood",
    }),
  );

  return {
    trackedBodies: { marble: marbleId },
    goalZones: [
      {
        id: "bucket",
        label: "Bucket",
        center: { x: bucketCx, y: bucketBaseY + wallH / 2 },
        halfExtents: { x: bucketHalfW - bucketWallT / 2, y: wallH / 2 },
      },
    ],
  };
};

export const level8Rocket: Level = {
  id: "level8_rocket",
  title: "Level 8 — Rocket",
  goalText: "Repel the marble straight up through the channel into the bucket.",
  setupScene,
  palette: {
    "ball+": { count: 3, fixed: true },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -4, minY: -0.5, maxX: 4, maxY: 11 },
};
