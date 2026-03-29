import { defineConfig, devices } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  fullyParallel: false,
  outputDir: "../test-results/",

  use: {
    baseURL: "http://localhost:3456",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { storageState: undefined },
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: path.resolve(__dirname, "../playwright/.auth/user.json"),
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],

  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: path.resolve(
          __dirname,
          "../.testing/PROGRESS/playwright-results.json"
        ),
      },
    ],
  ],
});
