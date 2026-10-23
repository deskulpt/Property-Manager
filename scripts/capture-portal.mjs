import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const BASE = "http://127.0.0.1:3505"
const OUT = path.join(root, "public/marketing")
const STORE =
  "/Users/aloke/Library/Application Support/Cursor/AgentStores/cursor_agent_stores/bc-a65bf168-6bf0-4836-95df-fe3076b1c938/files/media/hero"
fs.mkdirSync(OUT, { recursive: true })
fs.mkdirSync(STORE, { recursive: true })

async function shot(page, name) {
  const dest = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: dest, fullPage: false })
  fs.copyFileSync(dest, path.join(STORE, `${name}.png`))
  console.log("wrote", name, fs.statSync(dest).size)
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
})
const page = await context.newPage()

async function setUser(id) {
  await context.addCookies([
    {
      name: "deskulpt_user",
      value: id,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ])
}

await page.goto(`${BASE}/listings`, { waitUntil: "networkidle", timeout: 60000 })
await page.waitForTimeout(800)
await shot(page, "portal-listings")

await page.goto(`${BASE}/properties/waterman/units/B1`, {
  waitUntil: "networkidle",
  timeout: 60000,
})
await page.waitForTimeout(1000)
const walk = page.getByRole("tab", { name: /walkthrough/i })
if (await walk.count()) {
  await walk.click().catch(() => {})
  await page.waitForTimeout(1500)
}
await shot(page, "portal-unit-matterport")

await setUser("u_nadia")
await page.goto(`${BASE}/landlord`, { waitUntil: "networkidle", timeout: 60000 })
await page.waitForTimeout(800)
await shot(page, "portal-landlord")

await page.goto(`${BASE}/landlord/ask`, { waitUntil: "networkidle", timeout: 60000 })
await page.waitForTimeout(800)
await shot(page, "portal-ask-easy")

await setUser("u_devon")
await page.goto(`${BASE}/shop`, { waitUntil: "networkidle", timeout: 60000 })
await page.waitForTimeout(800)
await shot(page, "portal-shop")

await page.goto(`${BASE}/properties/waterman/units/B1`, {
  waitUntil: "networkidle",
  timeout: 60000,
})
await page.waitForTimeout(600)
const visitHeading = page.getByText(/book a visit|schedule a visit|visit booking/i).first()
if (await visitHeading.count()) {
  await visitHeading.scrollIntoViewIfNeeded().catch(() => {})
  await page.waitForTimeout(400)
}
await shot(page, "portal-visit")

await browser.close()
console.log("done")
