import { beforeEach, describe, expect, it } from "vitest"
import {
  absolutePublicUrl,
  evaluatePosterGate,
  propertyPosterSqft,
  publicPropertyPath,
  publicUnitPath,
} from "@/lib/poster-shared"
import { useTempDatabase } from "./helpers/temp-db"

useTempDatabase()

async function db() {
  return import("@/lib/db")
}

async function poster() {
  return import("@/lib/poster")
}

describe("QR poster gate and payloads", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
  })

  it("evaluatePosterGate blocks missing email, address, and sqft with clear copy", () => {
    const empty = evaluatePosterGate({ email: null, address: null, sizeSqft: null })
    expect(empty.ok).toBe(false)
    expect(empty.missing).toEqual(["email", "address", "sqft"])
    expect(empty.messages[0]).toMatch(/contact email/i)
    expect(empty.messages[1]).toMatch(/property address/i)
    expect(empty.messages[2]).toMatch(/unit size \(sq ft\)/i)

    const ready = evaluatePosterGate({
      email: "nadia@bbmparks.example",
      address: "Plot 19, Kalyan-Bhiwandi Road",
      sizeSqft: 52000,
    })
    expect(ready.ok).toBe(true)
    expect(ready.missing).toEqual([])
  })

  it("rejects invalid email and zero area", () => {
    expect(evaluatePosterGate({ email: "not-an-email", address: "X", sizeSqft: 10 }).ok).toBe(false)
    expect(evaluatePosterGate({ email: "a@b.co", address: "X", sizeSqft: 0 }).ok).toBe(false)
  })

  it("propertyPosterSqft sums when every unit has area, else null", () => {
    expect(propertyPosterSqft([{ sqft: 100 }, { sqft: 50 }])).toBe(150)
    expect(propertyPosterSqft([{ sqft: 100 }, { sqft: 0 }])).toBeNull()
    expect(propertyPosterSqft([])).toBeNull()
  })

  it("public paths encode slug and unit code", () => {
    expect(publicUnitPath("waterman", "B1")).toBe("/properties/waterman/units/B1")
    expect(publicPropertyPath("waterman")).toBe("/properties/waterman")
    expect(absolutePublicUrl("http://127.0.0.1:43123", "/properties/waterman")).toBe(
      "http://127.0.0.1:43123/properties/waterman",
    )
  })

  it("seeded unit B1 poster is ready with email, address, sqft, and unit URL path", async () => {
    const { buildUnitPoster, qrDataUrl, orgContactEmail } = await poster()
    const email = orgContactEmail("t_bbm")
    expect(email).toBeTruthy()
    const payload = buildUnitPoster("t_bbm", "u_waterman_b1")
    expect(payload).not.toBeNull()
    expect(payload!.gate.ok).toBe(true)
    expect(payload!.email).toBe(email)
    expect(payload!.address).toMatch(/Bhiwandi/i)
    expect(payload!.sizeSqft).toBeGreaterThan(0)
    expect(payload!.publicPath).toBe("/properties/waterman/units/B1")
    expect(payload!.subtitle).toBe("Unit B1")

    const dataUrl = await qrDataUrl("http://127.0.0.1:43123/properties/waterman/units/B1")
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true)
  })

  it("seeded property poster sums bay areas and points at property URL", async () => {
    const { buildPropertyPoster } = await poster()
    const payload = buildPropertyPoster("t_bbm", "p_waterman")
    expect(payload).not.toBeNull()
    expect(payload!.gate.ok).toBe(true)
    expect(payload!.publicPath).toBe("/properties/waterman")
    expect(payload!.sizeSqft).toBeGreaterThan(100000)
  })

  it("Harbourline cannot load a BBM unit poster", async () => {
    const { buildUnitPoster } = await poster()
    expect(buildUnitPoster("t_harbour", "u_waterman_b1")).toBeNull()
  })

  it("missing contact email blocks Download/Print readiness", async () => {
    const { getDb } = await db()
    const { buildUnitPoster } = await poster()
    getDb().prepare("UPDATE users SET email = '' WHERE tenant_id = 't_bbm' AND role = 'landlord_admin'").run()
    const payload = buildUnitPoster("t_bbm", "u_waterman_b1")
    expect(payload!.gate.ok).toBe(false)
    expect(payload!.gate.missing).toContain("email")
    expect(payload!.gate.messages.some((m) => /contact email/i.test(m))).toBe(true)
  })

  it("missing address blocks poster", async () => {
    const { getDb } = await db()
    const { buildUnitPoster } = await poster()
    getDb().prepare("UPDATE properties SET address = '' WHERE id = 'p_waterman'").run()
    const payload = buildUnitPoster("t_bbm", "u_waterman_b1")
    expect(payload!.gate.ok).toBe(false)
    expect(payload!.gate.missing).toContain("address")
  })

  it("missing unit area blocks unit and property posters", async () => {
    const { getDb } = await db()
    const { buildUnitPoster, buildPropertyPoster } = await poster()
    getDb().prepare("UPDATE units SET sqft = 0 WHERE id = 'u_waterman_b1'").run()
    const unitPoster = buildUnitPoster("t_bbm", "u_waterman_b1")
    expect(unitPoster!.gate.ok).toBe(false)
    expect(unitPoster!.gate.missing).toContain("sqft")

    const propertyPoster = buildPropertyPoster("t_bbm", "p_waterman")
    expect(propertyPoster!.gate.ok).toBe(false)
    expect(propertyPoster!.gate.missing).toContain("sqft")
  })
})
