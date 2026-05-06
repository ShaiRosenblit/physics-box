import { ball, box, pulley } from "../../simulation";
import { addWorkshopEnclosure } from "../../simulation/scenes/workshopEnclosure";
import type { Level, LevelHandles } from "../types";

/**
 * Level 20 — Pulley Lift.
 *
 * A heavy wooden gate hangs from one end of a rope-and-pulley; the other
 * end of the rope holds a small tray. The marble rolls down a ramp on
 * the left and gets stopped by the gate, which sits on the floor and
 * blocks its path. The player drops a single counterweight box onto the
 * tray on the right — the tray descends onto a fixed shelf, the gate is
 * pulled upward, and the marble rolls under the gate and into the bucket.
 *
 * This is the first level that introduces the pulley as a connector.
 * Mass budget: gate (~0.25 kg) is lighter than tray + counterweight box
 * (~0.47 kg), so any reasonable placement of the box reliably hoists the
 * gate. The tray's resting shelf bounds the lift so the gate stops at a
 * height the marble can pass under.
 */
const setupScene = (world: import("../../simulation").World): LevelHandles => {
  addWorkshopEnclosure(world);

  // ----- Release ramp on the left -----
  const rampAngle = -0.18;
  const rampCx = -3.5;
  const rampCy = 2.4;
  world.add(
    box({
      position: { x: rampCx, y: rampCy },
      width: 4.5,
      height: 0.18,
      angle: rampAngle,
      fixed: true,
      material: "wood",
    }),
  );

  const cosA = Math.cos(rampAngle);
  const sinA = Math.sin(rampAngle);
  const rampTopOffset = -2.0;
  const rampTopX = rampCx + cosA * rampTopOffset;
  const rampTopY = rampCy + sinA * rampTopOffset;
  const marbleR = 0.17;
  const marbleId = world.add(
    ball({
      position: { x: rampTopX, y: rampTopY + 0.4 },
      radius: marbleR,
      material: "metal",
      angularDamping: 0.04,
      linearDamping: 0.01,
    }),
  );

  // ----- Pulley + gate + tray -----
  const wheelX = 1.5;
  const wheelY = 7.5;
  const halfSpread = 1.5;

  const gateW = 0.3;
  const gateH = 1.4;
  const gateX = wheelX - halfSpread;
  const gateBottomInitial = 0;
  const gateCenterInitial = gateBottomInitial + gateH / 2;
  const gateId = world.add(
    box({
      position: { x: gateX, y: gateCenterInitial },
      width: gateW,
      height: gateH,
      material: "wood",
      angularDamping: 1.0,
      linearDamping: 0.1,
    }),
  );

  const trayW = 1.6;
  const trayH = 0.18;
  const trayX = wheelX + halfSpread;
  const trayCenterInitial = 1.7;
  const trayId = world.add(
    box({
      position: { x: trayX, y: trayCenterInitial },
      width: trayW,
      height: trayH,
      material: "wood",
      angularDamping: 1.5,
      linearDamping: 0.2,
    }),
  );

  world.addConstraint(
    pulley({
      wheelCenter: { x: wheelX, y: wheelY },
      bodyA: gateId,
      bodyB: trayId,
      localAnchorA: { x: 0, y: gateH / 2 },
      localAnchorB: { x: 0, y: trayH / 2 },
      halfSpread,
    }),
  );

  // ----- Shelf the tray drops onto -----
  const shelfTop = 1.0;
  const shelfThickness = 0.18;
  world.add(
    box({
      position: { x: trayX, y: shelfTop - shelfThickness / 2 },
      width: 2.4,
      height: shelfThickness,
      fixed: true,
      material: "wood",
    }),
  );
  const pillarH = shelfTop - shelfThickness;
  const pillarT = 0.08;
  for (const px of [trayX - 1.0, trayX + 1.0]) {
    world.add(
      box({
        position: { x: px, y: pillarH / 2 },
        width: pillarT,
        height: pillarH,
        fixed: true,
        material: "wood",
      }),
    );
  }

  // ----- Bucket on the far right -----
  const bucketCx = 5.5;
  const bucketBaseY = 0;
  const wallH = 1.0;
  const bucketHalfW = 0.65;
  const wallT = 0.12;
  world.add(
    box({
      position: { x: bucketCx - bucketHalfW, y: bucketBaseY + wallH / 2 },
      width: wallT,
      height: wallH,
      fixed: true,
      material: "wood",
    }),
  );
  world.add(
    box({
      position: { x: bucketCx + bucketHalfW, y: bucketBaseY + wallH / 2 },
      width: wallT,
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
        halfExtents: { x: bucketHalfW - wallT / 2, y: wallH / 2 },
      },
    ],
  };
};

export const level20PulleyLift: Level = {
  id: "level20_pulleyLift",
  title: "Level 20 — Pulley Lift",
  goalText: "Drop a counterweight on the right tray to hoist the gate and free the marble.",
  setupScene,
  palette: {
    box: { count: 1 },
  },
  goal: {
    kind: "bodyInZone",
    bodyRef: "marble",
    zoneId: "bucket",
  },
  viewBounds: { minX: -7, minY: -0.5, maxX: 8, maxY: 9 },
};
