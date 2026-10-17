import { expect, test } from "@playwright/test"
import {
  collectSameOriginPaths,
  expectPageOk,
  gotoMaybe,
  setAdminIdentity,
  setDemoIdentity,
  stripHash,
} from "./helpers"

test.describe("marketing pages", () => {
  test("home loads", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
    await expect(page.locator("body")).toContainText(/Easy Rental|DeSkulpt|industrial|leasing|listings/i)
  })

  for (const route of [
    { path: "/pricing", name: /pricing|plan|starter|pro|growth/i },
    { path: "/partners", name: /partner/i },
    { path: "/refer", name: /refer|earn|reward|indicat/i },
    { path: "/about", name: /about|easy rental|deskulpt/i },
  ] as const) {
    test(`${route.path} (soft-skip if absent)`, async ({ page }) => {
      const { missing } = await gotoMaybe(page, route.path)
      test.skip(missing, `${route.path} not on this branch yet`)
      await expectPageOk(page)
      await expect(page.locator("body")).toContainText(route.name)
    })
  }

  test("careers + legal footer targets (soft-skip if absent)", async ({ page }) => {
    for (const path of ["/careers", "/legal/terms", "/legal/privacy"]) {
      const { missing } = await gotoMaybe(page, path)
      if (missing) continue
      await expectPageOk(page)
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
    }
  })

  test("header phone / WhatsApp utility (skip if absent)", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)

    const tel = page.locator('a[href^="tel:"]:visible')
    const wa = page.locator(
      'a[href*="wa.me"]:visible, a[href*="whatsapp.com"]:visible, a[href*="api.whatsapp.com"]:visible',
    )
    const telCount = await tel.count()
    const waCount = await wa.count()
    test.skip(telCount === 0 && waCount === 0, "phone/WhatsApp utility strip not on this branch yet")

    if (telCount > 0) {
      await expect(tel.first()).toBeVisible()
      const href = (await tel.first().getAttribute("href")) ?? ""
      expect(href).toMatch(/^tel:\+?91/)
    }
    if (waCount > 0) {
      await expect(wa.first()).toBeVisible()
    }
  })
})

test.describe("auth", () => {
  test("auth /login (skip if not shipped)", async ({ page }) => {
    const { missing } = await gotoMaybe(page, "/login")
    test.skip(missing, "/login not on this branch yet (auth slice)")
    await expectPageOk(page)
    await expect(
      page.getByRole("heading", { name: /log ?in|sign in/i }).or(page.getByText(/log ?in|sign in/i)).first(),
    ).toBeVisible()
    const email = page.locator('input[type="email"], input[name="email"]').first()
    if ((await email.count()) > 0) {
      await expect(email).toBeVisible()
    }
  })

  test("auth /signup (skip if not shipped)", async ({ page }) => {
    const { missing } = await gotoMaybe(page, "/signup")
    test.skip(missing, "/signup not on this branch yet (auth slice)")
    await expectPageOk(page)
    await expect(
      page
        .getByRole("heading", { name: /sign ?up|create (an )?account|register/i })
        .or(page.getByText(/sign ?up|create (an )?account/i))
        .first(),
    ).toBeVisible()
    const email = page.locator('input[type="email"], input[name="email"]').first()
    if ((await email.count()) > 0) {
      await expect(email).toBeVisible()
    }
  })
})

test.describe("listings + map + unit", () => {
  test("listings load", async ({ page }) => {
    await page.goto("/listings", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
    await expect(page.locator("body")).toContainText(/listing|Bhiwandi|unit|sq ?ft|filter|available|bay/i)
  })

  test("home map section or listings map", async ({ page }) => {
    await page.goto("/#map", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    const mapShell = page.locator(".leaflet-container, [data-testid='leasing-map'], #map")
    const listingsMap = page.locator(".leaflet-container")
    if ((await mapShell.count()) === 0) {
      await page.goto("/listings", { waitUntil: "domcontentloaded" })
      await expectPageOk(page)
      test.skip((await listingsMap.count()) === 0, "map UI not on this branch yet")
    }
    await expect(page.locator(".leaflet-container, #map").first()).toBeVisible({ timeout: 20_000 })
  })

  test("unit page Matterport embed container", async ({ page }) => {
    await page.goto("/properties/waterman/units/B1", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()

    const walkTab = page.getByRole("tab", { name: /walkthrough/i })
    await expect(walkTab).toBeVisible()
    await walkTab.click()

    const frame = page.locator('iframe[title="Matterport walkthrough"]')
    await expect(frame).toBeVisible({ timeout: 20_000 })
    const src = await frame.getAttribute("src")
    expect(src ?? "").toMatch(/matterport\.com/i)
  })

  test("QR poster route (skip if not shipped)", async ({ page }) => {
    await setDemoIdentity(page, "u_nadia")
    const { missing } = await gotoMaybe(page, "/landlord/poster/u_waterman_b1")
    test.skip(missing, "QR poster route not on this branch yet")
    await expectPageOk(page)
    await expect(page.locator("body")).toContainText(/poster|QR|print|sq ?ft|contact|address|unit/i)
  })
})

test.describe("console (super admin)", () => {
  test.beforeEach(async ({ page }) => {
    await setAdminIdentity(page, "u_platform_admin")
  })

  for (const path of [
    "/console",
    "/console/analytics",
    "/console/tenants",
    "/console/shops",
    "/console/providers",
    "/console/partners",
    "/console/referrals",
    "/console/pricing",
  ]) {
    test(`${path} loads for platform admin`, async ({ page }) => {
      const { missing } = await gotoMaybe(page, path)
      test.skip(missing, `${path} not on this branch yet`)
      // Gate redirects unauthenticated users to /login — cookie should keep us in.
      await expect(page).not.toHaveURL(/\/login/)
      await expectPageOk(page)
      await expect(page.locator("body")).toContainText(/console|tenant|partner|pricing|analytic|shop|provider|referral/i)
    })
  }

  test("admin sticky role switcher requires platform admin session", async ({ page }) => {
    await page.context().clearCookies()
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)
    await expect(page.getByTestId("admin-session-bar")).toHaveCount(0)

    await page.goto("/login", { waitUntil: "domcontentloaded" })
    await page.locator('input[name="email"]').fill("anand2064@gmail.com")
    await page.locator('input[name="password"]').fill(process.env.E2E_ADMIN_PASSWORD || "")
    test.skip(!process.env.E2E_ADMIN_PASSWORD, "E2E_ADMIN_PASSWORD not set")
    await page.getByRole("button", { name: "Log in" }).click()
    await page.waitForURL(/\/console/)
    await expect(page.getByTestId("admin-session-bar")).toBeVisible()
    const switcher = page.getByTestId("demo-identity")
    await expect(switcher).toBeVisible()
  })
})

test.describe("landlord / PM desks", () => {
  test("applications pending (Nadia)", async ({ page }) => {
    await setDemoIdentity(page, "u_nadia")
    const { missing } = await gotoMaybe(page, "/landlord/applications")
    test.skip(missing, "/landlord/applications not on this branch yet")
    await expectPageOk(page)
    await expect(page.locator("body")).toContainText(/application|pending|approve|Maya|inbox|clear/i)
  })

  test("listing / properties desk (soft-skip create if absent)", async ({ page }) => {
    await setDemoIdentity(page, "u_nadia")
    const { missing } = await gotoMaybe(page, "/landlord/properties")
    test.skip(missing, "/landlord/properties not on this branch yet")
    await expectPageOk(page)
    await expect(page.locator("body")).toContainText(/propert|building|bay|unit|Waterman|floor/i)

    const create = page.getByRole("link", { name: /create|new (listing|property)|add (listing|property)/i })
      .or(page.getByRole("button", { name: /create|new (listing|property)|add (listing|property)/i }))
    if ((await create.count()) === 0) {
      test.info().annotations.push({
        type: "note",
        description: "listing create CTA not shipped — properties list covered",
      })
      return
    }
    await expect(create.first()).toBeVisible()
  })

  test("landlord desk home", async ({ page }) => {
    await setDemoIdentity(page, "u_nadia")
    const { missing } = await gotoMaybe(page, "/landlord")
    test.skip(missing, "/landlord not on this branch yet")
    await expectPageOk(page)
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
  })
})

test.describe("account + rent calculator", () => {
  test("account / profile (Maya)", async ({ page }) => {
    await setDemoIdentity(page, "u_maya")
    const { missing } = await gotoMaybe(page, "/account")
    test.skip(missing, "/account not on this branch yet")
    await expectPageOk(page)
    await expect(page.locator("body")).toContainText(/account|profile|application|unit|Maya|rent/i)
  })

  test("account payments", async ({ page }) => {
    await setDemoIdentity(page, "u_maya")
    const { missing } = await gotoMaybe(page, "/account/payments")
    test.skip(missing, "/account/payments not on this branch yet")
    await expectPageOk(page)
  })

  test("rent calculator (soft-skip if absent)", async ({ page }) => {
    for (const path of ["/tools/rent-estimate", "/rent-estimate", "/rent-calculator", "/tools/rent-calculator", "/estimate"]) {
      const { missing } = await gotoMaybe(page, path)
      if (missing) continue
      await expectPageOk(page)
      await expect(page.locator("body")).toContainText(/rent|estimat|calculat|sq ?ft|INR|₹/i)
      return
    }
    test.skip(true, "rent calculator route not on this branch yet")
  })
})

test.describe("no dead-end crawl", () => {
  test("home + footer same-origin hrefs are not 404", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expectPageOk(page)

    const fromHome = await collectSameOriginPaths(page)
    const footer = page.locator('footer a[href], nav[aria-label="Site"] a[href]')
    await expect(footer.first()).toBeVisible()

    const paths = new Set<string>()
    for (const p of fromHome) paths.add(stripHash(p.split("#")[0] || "/"))
    // Always include known marketing anchors even if home markup changes.
    for (const p of ["/", "/listings", "/pricing", "/partners", "/refer", "/about", "/login", "/signup"]) {
      paths.add(p)
    }

    const failures: string[] = []
    for (const path of Array.from(paths).sort()) {
      if (!path || path.startsWith("/files/")) continue
      const response = await page.goto(path, { waitUntil: "domcontentloaded" })
      const status = response?.status() ?? 0
      if (status === 404) {
        failures.push(`${path} → HTTP 404`)
        continue
      }
      const notFound = page.getByRole("heading", { name: /not found|404/i })
      if ((await notFound.count()) > 0 && (await notFound.first().isVisible())) {
        failures.push(`${path} → Not Found heading`)
      }
    }

    expect(failures, failures.join("\n")).toEqual([])
  })
})
