import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run e2e:dev",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "owner",
      dependencies: ["setup"],
      testMatch: [
        /.*owner-onboarding\.spec\.ts/,
        /.*property-calendar-sync\.spec\.ts/,
        /.*my-team\.spec\.ts/,
        /.*owner-job-assignment\.spec\.ts/,
      ],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/owner.json",
      },
    },
    {
      name: "provider",
      dependencies: ["owner"],
      testMatch: [/.*provider-onboarding\.spec\.ts/, /.*provider-work-queue\.spec\.ts/, /.*provider-job-execution\.spec\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/provider.json",
      },
    },
    {
      name: "owner-verification",
      dependencies: ["provider"],
      testMatch: [/.*owner-verifies-job-updates\.spec\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/owner.json",
      },
    },
  ],
});