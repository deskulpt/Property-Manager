import { defineConfig, devices } from "@playwright/test"
import path from "node:path"
import os from "node:os"
import fs from "node:fs"

const e2ePort = Number(process.env.E2E_PORT || 43124)
const isCI = !!process.env.CI
const e2eDbDir = fs.mkdtempSync(path.join(os.tmpdir(), "deskulpt-e2e-"))
const e2eDb = path.join(e2eDbDir, "deskulpt.sqlite")
const distDir = process.env.DESKULPT_DIST_DIR || (isCI ? ".next" : ".next-e2e")

/**
 * Local: `next dev` on a throwaway port/DB/dist so desktop `npm run dev` (43123) is untouched.
 * CI: workflow runs `npm run build` first; webServer uses `next start` against that build.
 * Seed: empty DESKULPT_DB_PATH auto-seeds India demo (no Razorpay/OTP).
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: isCI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${e2ePort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  outputDir: "test-results",
  webServer: {
    command: isCI
      ? `npx next start -H 127.0.0.1 -p ${e2ePort}`
      : `npx next dev --webpack -H 127.0.0.1 -p ${e2ePort}`,
    url: `http://127.0.0.1:${e2ePort}`,
    reuseExistingServer: !isCI && process.env.E2E_REUSE_SERVER === "1",
    timeout: 180_000,
    env: {
      ...process.env,
      DESKULPT_DB_PATH: e2eDb,
      DESKULPT_DIST_DIR: distDir,
      DESKULPT_SECRET_KEY: process.env.DESKULPT_SECRET_KEY || "deskulpt-e2e-secret-key-32b",
      DESKULPT_DEMO_SWITCHER: "1",
      // Skip Google font network fetch during e2e webServer boot.
      DESKULPT_OFFLINE_FONTS: "1",
      // Keyless demo path — no Dodo/Stripe/PayPal credentials required
      BILLING_PROVIDER: "demo",
      BILLING_INTL_PROVIDER: "demo",
      OTP_LIVE: "0",
      KYC_LIVE: "0",
      OTP_SMS_PROVIDER: process.env.OTP_SMS_PROVIDER || "demo",
      KYC_PROVIDER: process.env.KYC_PROVIDER || "demo",
    },
  },
})
