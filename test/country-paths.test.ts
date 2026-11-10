import { describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"
import { CANADA_PACK, INDIA_PACK } from "@/lib/markets/packs"
import { CountryPackSchema } from "@/lib/markets/types"
import {
  countryPrefixedPath,
  isoForPathSegment,
  knownPathSegments,
  stripCountryPrefix,
} from "@/lib/markets/path-segments"
import { legalFlag, resolveLegalFlags } from "@/lib/markets/legal-flags"
import { computeCountryTax, taxRegistrationIdForIso } from "@/lib/markets/tax-adapters"
import { paymentRailsForIso } from "@/lib/markets/payment-rails"
import { aiPolicyForIso, assertAiPiiAllowed } from "@/lib/markets/ai-policy"
import { assertAccountCountryMatch } from "@/lib/markets/account-country"

installTempDatabase()

describe("country path packs (Aloke Nov7)", () => {
  it("parses IN/CA packs with entities + path segments", () => {
    const inPack = CountryPackSchema.parse(INDIA_PACK)
    const caPack = CountryPackSchema.parse(CANADA_PACK)
    expect(inPack.pathSegment).toBe("in")
    expect(caPack.pathSegment).toBe("ca")
    expect(inPack.legalEntity).toBe("Deskulpt Commerce India Pvt Ltd")
    expect(caPack.legalEntity).toBe("Deskulpt Inc")
    expect(knownPathSegments().sort()).toEqual(["ca", "in"])
  })

  it("records Deskulpt Inc GST/HST registration on CA pack (adapter still OFF)", () => {
    const caPack = CountryPackSchema.parse(CANADA_PACK)
    expect(caPack.taxRegistrationId).toMatch(/^\d{9}RT\d{4}$/)
    expect(taxRegistrationIdForIso("CA")).toBe(caPack.taxRegistrationId)
    expect(taxRegistrationIdForIso("IN")).toBeNull()
    expect(legalFlag("CA", "caStripeTaxHst")).toBe(false)
    expect(caPack.taxAdapter.enabled).toBe(false)
  })

  it("maps path segments and strips prefixes", () => {
    expect(isoForPathSegment("in")).toBe("IN")
    expect(isoForPathSegment("ca")).toBe("CA")
    expect(isoForPathSegment("us")).toBeNull()
    expect(countryPrefixedPath("IN", "/listings")).toBe("/in/listings")
    expect(stripCountryPrefix("/ca/landlord/billing")).toEqual({
      iso: "CA",
      path: "/landlord/billing",
    })
  })

  it("keeps LEGAL_FEATURE_FLAGS fail-closed (Aloke AwC, flags OFF)", () => {
    for (const iso of ["IN", "CA"] as const) {
      const flags = resolveLegalFlags(iso === "IN" ? INDIA_PACK : CANADA_PACK)
      expect(flags.ontarioConnectDirectPad).toBe(false)
      expect(flags.razorpayIndianEntity).toBe(false)
      expect(flags.caStripeTaxHst).toBe(false)
      expect(flags.inTaxMatrix).toBe(false)
      expect(flags.realPiiAiConnectorsMedia).toBe(false)
      expect(legalFlag(iso, "ontarioConnectDirectPad")).toBe(false)
    }
  })

  it("gates tax adapters and payment rails OFF", () => {
    expect(computeCountryTax({ iso: "CA", taxableMinor: 10_000 }).ok).toBe(false)
    expect(computeCountryTax({ iso: "IN", taxableMinor: 10_000 }).ok).toBe(false)
    const caRails = paymentRailsForIso("CA")
    expect(caRails.connectDirectPad).toBe(false)
    expect(caRails.blocked.some((b) => b.includes("stripe_connect_direct_pad"))).toBe(true)
    const inRails = paymentRailsForIso("IN")
    expect(inRails.razorpayIndianEntity).toBe(false)
  })

  it("AI policy: Cloudflare stack + real PII blocked", () => {
    const policy = aiPolicyForIso("IN")
    expect(policy.stack.gateway).toBe("cloudflare_ai_gateway")
    expect(policy.stack.inference).toBe("cloudflare_workers_ai")
    expect(policy.allowRealPii).toBe(false)
    expect(assertAiPiiAllowed("CA").ok).toBe(false)
  })

  it("binds accounts to one country (L0/L1 no bypass — CTO)", () => {
    expect(
      assertAccountCountryMatch({ accountIso: "IN", requestIso: "CA", roleLevel: 2 }).ok,
    ).toBe(false)
    expect(
      assertAccountCountryMatch({ accountIso: "IN", requestIso: "CA", roleLevel: 0 }).ok,
    ).toBe(false)
    expect(
      assertAccountCountryMatch({ accountIso: "CA", requestIso: "CA", roleLevel: 0 }).ok,
    ).toBe(true)
  })
})
