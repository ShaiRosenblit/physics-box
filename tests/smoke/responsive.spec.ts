import { expect, test } from "@playwright/test";

/**
 * Responsive shell smoke. Verifies the canvas dominates at every
 * breakpoint, that the phone mode swaps inline panels for FABs +
 * drawers, that the on-canvas peek replaces auto-opening the inspector
 * during drags, and that the welcome scene is fully framed on first
 * paint at every viewport size.
 */

declare global {
  interface Window {
    __pb?: {
      setSelectedId: (id: number | null) => void;
      setDragging: (active: boolean) => void;
      fitView: () => void;
      getCameraState: () => {
        center: { x: number; y: number };
        zoom: number;
        canvas: { width: number; height: number };
      } | null;
      getBodies: () => Array<{
        id: number;
        kind: "ball" | "box" | "magnet";
        position: { x: number; y: number };
      }>;
    };
  }
}

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800, mode: "desktop" as const },
  { name: "tablet", width: 800, height: 600, mode: "tablet" as const },
  { name: "phone", width: 390, height: 844, mode: "phone" as const },
];

for (const vp of VIEWPORTS) {
  test(`${vp.name} (${vp.width}x${vp.height}): canvas dominates and core controls work`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");

    await expect(page.getByTestId("app-root")).toBeVisible();
    await expect(page.getByTestId("canvas-host")).toBeVisible();

    const canvasBox = await page.getByTestId("canvas-host").boundingBox();
    if (!canvasBox) throw new Error("canvas-host not laid out");
    expect(canvasBox.width).toBeGreaterThanOrEqual(vp.width * 0.6);

    if (vp.mode === "desktop") {
      // Both panels rendered inline at desktop widths.
      await expect(page.getByTestId("toolbar")).toBeVisible();
      await expect(page.getByTestId("inspector")).toBeVisible();
      await expect(page.getByTestId("tool-ball")).toBeVisible();
    }

    if (vp.mode === "tablet") {
      // Tablet keeps the inline rail toolbar but moves the inspector
      // into a FAB + drawer to free up canvas width.
      await expect(page.getByTestId("toolbar")).toBeVisible();
      await expect(page.getByTestId("tool-ball")).toBeVisible();
      await expect(page.getByTestId("fab-inspector")).toBeVisible();
      await expect(page.getByTestId("drawer-inspector")).toHaveAttribute(
        "data-state",
        "closed",
      );
    }

    if (vp.mode === "phone") {
      // FABs rendered, drawers start closed.
      await expect(page.getByTestId("fab-tools")).toBeVisible();
      await expect(page.getByTestId("fab-inspector")).toBeVisible();
      await expect(page.getByTestId("drawer-tools")).toHaveAttribute(
        "data-state",
        "closed",
      );
      await expect(page.getByTestId("drawer-inspector")).toHaveAttribute(
        "data-state",
        "closed",
      );

      // Tapping the FAB opens the drawer with the labelled toolbar inside.
      await page.getByTestId("fab-tools").click();
      await expect(page.getByTestId("drawer-tools")).toHaveAttribute(
        "data-state",
        "open",
      );
      await expect(page.getByTestId("tool-ball")).toBeVisible();

      // Selecting a tool dismisses the sheet.
      await page.getByTestId("tool-ball").click();
      await expect(page.getByTestId("drawer-tools")).toHaveAttribute(
        "data-state",
        "closed",
      );
    }

    // Fit-view button is visible on every viewport.
    await expect(page.getByTestId("button-fit-view")).toBeVisible();
  });
}

test("phone: selection shows peek, drag suppresses it, drawer never auto-opens", async ({
  page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByTestId("scene-select").selectOption("welcome");

    // Wait until the dev probe is mounted (first effect runs after Pixi attach).
  await page.waitForFunction(() => Boolean(window.__pb));

  // Pick the first body in the welcome scene to act as our selection.
  const firstBodyId = await page.evaluate(() => {
    const bodies = window.__pb!.getBodies();
    return bodies.length > 0 ? bodies[0].id : null;
  });
  expect(firstBodyId).not.toBeNull();

  // No selection yet → peek is not in the DOM.
  expect(await page.getByTestId("inspector-peek").count()).toBe(0);

  // Select a body and verify the peek appears with idle state.
  await page.evaluate((id) => window.__pb!.setSelectedId(id), firstBodyId);
  await expect(page.getByTestId("inspector-peek")).toBeVisible();
  await expect(page.getByTestId("inspector-peek")).toHaveAttribute(
    "data-state",
    "idle",
  );

  // Drag start: drawer must stay closed and the peek must mute itself
  // out of the way (data-state="dragging"). This is the user-reported
  // regression: the inspector used to slide up over the body mid-drag.
  await page.evaluate(() => window.__pb!.setDragging(true));
  await expect(page.getByTestId("drawer-inspector")).toHaveAttribute(
    "data-state",
    "closed",
  );
  await expect(page.getByTestId("inspector-peek")).toHaveAttribute(
    "data-state",
    "dragging",
  );

  // Drag end: peek returns to idle, still doesn't auto-open the drawer.
  await page.evaluate(() => window.__pb!.setDragging(false));
  await expect(page.getByTestId("inspector-peek")).toHaveAttribute(
    "data-state",
    "idle",
  );
  await expect(page.getByTestId("drawer-inspector")).toHaveAttribute(
    "data-state",
    "closed",
  );

  // Tapping the peek is the only path to the full inspector on phone.
  await page.getByTestId("inspector-peek").click();
  await expect(page.getByTestId("drawer-inspector")).toHaveAttribute(
    "data-state",
    "open",
  );
});

for (const vp of VIEWPORTS) {
  test(`${vp.name}: welcome scene is fully framed on first paint`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");
    await page.getByTestId("scene-select").selectOption("welcome");
    await page.waitForFunction(() => Boolean(window.__pb));

    // Allow one RAF for the fit-to-content path to apply.
    await page.waitForTimeout(120);

    const result = await page.evaluate(() => {
      const cam = window.__pb!.getCameraState();
      const bodies = window.__pb!.getBodies();
      return { cam, bodies };
    });

    expect(result.cam).not.toBeNull();
    const { center, zoom, canvas } = result.cam!;
    const halfW = canvas.width / 2 / zoom;
    const halfH = canvas.height / 2 / zoom;
    const minX = center.x - halfW;
    const maxX = center.x + halfW;
    const minY = center.y - halfH;
    const maxY = center.y + halfH;

    // Every dynamic welcome-scene body sits inside the visible bounds.
    // (We tolerate the 40 m ground plate which is intentionally clipped.)
    for (const b of result.bodies) {
      if (b.position.x < -15 || b.position.x > 15) continue; // skip ground
      expect(b.position.x).toBeGreaterThanOrEqual(minX - 0.1);
      expect(b.position.x).toBeLessThanOrEqual(maxX + 0.1);
      expect(b.position.y).toBeGreaterThanOrEqual(minY - 0.1);
      expect(b.position.y).toBeLessThanOrEqual(maxY + 0.1);
    }
  });
}
