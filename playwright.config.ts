import { defineConfig, devices } from "@playwright/test"
import path from "node:path"
import os from "node:os"
import fs from "node:fs"

const e2ePort = 43124
const e2eDbDir = fs.mkdtempSync(path.join(os.tmpdir(), "deskulpt-e2e-"))
const e2eDb = path.join(e2eDbDir, "deskulpt.sqlite")

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${e2ePort}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npx next dev -H 127.0.0.1 -p ${e2ePort}`,
    url: `http://127.0.0.1:${e2ePort}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DESKULPT_DB_PATH: e2eDb,
      DESKULPT_DIST_DIR: ".next-e2e",
    },
  },
})
