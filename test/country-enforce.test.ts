import { describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"
import {
  assertCountryDataScope,
  assertLiveModelAllowed,
  assertOntarioConnectPadAllowed,
  assertRazorpayCheckoutAllowed,
  dataResidencyDeclarative,
} from "@/lib/markets/enforce"
import { resolveShopPaymentProvider } from "@/lib/shop-payments"
import { adminListComplianceFlags, ensureLegalFlagOverridesRegistered } from "@/lib/markets/legal-overrides"

installTempDatabase()

describe("country LEGAL enforcement (CTO #47)", () => {
  it("gates Razorpay and Connect fail-closed", () => {
    expect(assertRazorpayCheckoutAllowed("IN").ok).toBe(false)
    expect(assertOntarioConnectPadAllowed("CA").ok).toBe(false)
  })

  it("forces demo shop pay while razorpayIndianEntity OFF", () => {
    const provider = resolveShopPaymentProvider({
      demoMode: false,
      hasSecret: true,
      keyId: "rzp_test_x",
      countryIso: "IN",
    })
    expect(provider.name).toBe("demoShopPay")
  })

  it("blocks live model when realPii flag OFF", () => {
    expect(assertLiveModelAllowed("IN").ok).toBe(false)
    expect(assertLiveModelAllowed("CA").ok).toBe(false)
  })

  it("blocks cross-country data for all roles", () => {
    expect(
      assertCountryDataScope({ requestIso: "IN", resourceIso: "CA", label: "tenant" }).ok,
    ).toBe(false)
    expect(
      assertCountryDataScope({ requestIso: "IN", resourceIso: "IN", label: "tenant" }).ok,
    ).toBe(true)
  })

  it("dataResidency stays declarative (not storage-enforced)", () => {
    const res = dataResidencyDeclarative("CA")
    expect(res.declarative).toBe(true)
    expect(res.enforcedByStorage).toBe(false)
    expect(res.region).toBe("CA")
  })

  it("exposes compliance flag rows for Admin sibling", () => {
    ensureLegalFlagOverridesRegistered()
    const rows = adminListComplianceFlags(["CA", "IN"])
    expect(rows.length).toBeGreaterThan(10)
    expect(rows.every((r) => r.effective === false)).toBe(true)
  })
})
