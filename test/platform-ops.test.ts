import { describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"

installTempDatabase()

describe("platform ops flags", () => {
  it("toggles durable ops flags via meta", async () => {
    const { getDb } = await import("@/lib/db")
    getDb() // open + seed
    const { isOpsFlagOn, setOpsFlag, listOpsFlags } = await import("@/lib/platform-ops")
    expect(isOpsFlagOn("partner_network")).toBe(true)
    setOpsFlag("partner_network", false)
    expect(isOpsFlagOn("partner_network")).toBe(false)
    expect(listOpsFlags().find((f) => f.key === "partner_network")?.on).toBe(false)
    setOpsFlag("partner_network", true)
    expect(isOpsFlagOn("partner_network")).toBe(true)
  })

  it("lists adapter status without throwing", async () => {
    const { getDb } = await import("@/lib/db")
    getDb()
    const { otpAdapterStatus, kycAdapterStatus, esignAdapterStatus, billingAdapterStatus } =
      await import("@/lib/platform-ops")
    expect(otpAdapterStatus().length).toBeGreaterThan(0)
    expect(kycAdapterStatus()[0]?.id).toBe("kyc")
    expect(esignAdapterStatus().some((a) => a.id === "esign-digio")).toBe(true)
    expect(billingAdapterStatus()[0]?.id).toBe("billing")
  })
})
