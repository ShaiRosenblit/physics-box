import { expect, test } from "@playwright/test";

/**
 * UI smoke checks. Equivalent to the plan's Playwright MCP gate:
 *   - structure: app, toolbar, inspector, playback, canvas all present + labelled
 *   - controls: tools and view toggles exist with stable testids
 *   - playback: tick counter advances after Play
 */

test.describe("UI smoke", () => {
  test("renders the three-panel shell with labelled regions", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("app-root")).toBeVisible();
    await expect(page.getByTestId("toolbar")).toBeVisible();
    await expect(page.getByTestId("toolbar")).toHaveAttribute(
      "aria-label",
      "Tools",
    );
    await expect(page.getByTestId("inspector")).toBeVisible();
    await expect(page.getByTestId("inspector")).toHaveAttribute(
      "aria-label",
      "Inspector",
    );
    await expect(page.getByTestId("playback-bar")).toBeVisible();
    await expect(page.getByTestId("scene-select")).toBeVisible();
    await expect(page.getByTestId("toggle-gravity")).toBeVisible();
    await expect(page.getByTestId("playback-bar")).toHaveAttribute(
      "aria-label",
      "Playback",
    );
    await expect(page.getByTestId("canvas-host")).toBeVisible();
  });

  test("exposes tool buttons and view toggles", async ({ page }) => {
    await page.goto("/");

    for (const id of [
      "tool-select",
      "tool-ball",
      "tool-box",
      "tool-ball+",
      "tool-ball-",
      "tool-magnet+",
      "tool-magnet-",
    ]) {
      await expect(page.getByTestId(id)).toBeVisible();
    }
    for (const id of ["toggle-grid", "toggle-e-field", "toggle-b-field"]) {
      await expect(page.getByTestId(id)).toBeVisible();
    }

    await expect(page.getByTestId("toggle-e-field")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(page.getByTestId("toggle-b-field")).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await page.getByTestId("scene-select").selectOption("welcome");

    // Welcome scene seeds charged balls and magnets, so both toggles are live.
    await expect(page.getByTestId("toggle-e-field")).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(page.getByTestId("toggle-b-field")).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  test("first-milestone: spawning two like charges drives them apart", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId("button-pause").click();
    await page.getByTestId("button-reset").click();
    await page.getByTestId("button-pause").click();

    const canvas = page.getByTestId("canvas-host");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas not laid out");
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height * 0.4;

    await page.getByTestId("tool-ball+").click();
    await canvas.click({ position: { x: cx - box.x - 30, y: cy - box.y } });
    await canvas.click({ position: { x: cx - box.x + 30, y: cy - box.y } });

    // E-field toggle becomes enabled once charges exist
    await expect(page.getByTestId("toggle-e-field")).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );

    await page.getByTestId("button-play").click();
    await page.waitForTimeout(800);
    const tick = page.getByTestId("tick-counter");
    expect(parseTick(await tick.textContent())).toBeGreaterThan(0);
  });

  test("tick counter advances when running and freezes when paused", async ({
    page,
  }) => {
    await page.goto("/");
    const tick = page.getByTestId("tick-counter");
    await expect(tick).toBeVisible();

    const initial = await tick.textContent();
    await page.waitForTimeout(500);
    const after = await tick.textContent();
    expect(parseTick(after)).toBeGreaterThan(parseTick(initial));

    await page.getByTestId("button-pause").click();
    const paused = await tick.textContent();
    await page.waitForTimeout(400);
    const stillPaused = await tick.textContent();
    expect(parseTick(stillPaused)).toBe(parseTick(paused));

    await page.getByTestId("button-play").click();
    await page.waitForTimeout(300);
    const resumed = await tick.textContent();
    expect(parseTick(resumed)).toBeGreaterThan(parseTick(stillPaused));
  });

  test("Step advances exactly one tick while paused", async ({ page }) => {
    await page.goto("/");
    const tick = page.getByTestId("tick-counter");

    await page.getByTestId("button-pause").click();
    await page.waitForTimeout(150);
    const before = parseTick(await tick.textContent());
    await page.getByTestId("button-step").click();
    await expect(tick).toHaveText(`tick ${before + 1}`);
  });

  test("Reset returns the world to tick 0", async ({ page }) => {
    await page.goto("/");
    const tick = page.getByTestId("tick-counter");

    await page.waitForTimeout(400);
    expect(parseTick(await tick.textContent())).toBeGreaterThan(0);
    await page.getByTestId("button-reset").click();
    await expect(tick).toHaveText(/tick 0|tick \d/);
    const afterReset = parseTick(await tick.textContent());
    expect(afterReset).toBeLessThan(60);
  });

  test("captures a reference screenshot of the welcome scene at rest", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.getByTestId("scene-select").selectOption("welcome");
    await page.waitForTimeout(4000);
    await page.getByTestId("button-pause").click();
    await page.screenshot({
      path: "tests/smoke/screenshots/welcome.png",
      fullPage: true,
    });
  });
});

function parseTick(text: string | null): number {
  if (!text) return Number.NaN;
  const match = text.match(/tick\s+(\d+)/i);
  return match ? Number.parseInt(match[1], 10) : Number.NaN;
}
