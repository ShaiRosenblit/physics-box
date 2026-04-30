import { defineConfig } from "@playwright/test";

const PORT = 4737;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/smoke",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
