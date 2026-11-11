import { describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"
import {
  assertOntarioCaslMarketing,
  assertOntarioDepositAllowed,
  assertOntarioFormHumanReview,
  assertOntarioListingImportAllowed,
  assertOntarioNoAutomatedEviction,
  assertOntarioPadOptional,
  assertOntarioResidentialOnly,
  assertOntarioTenantCardFeeOff,
} from "@/lib/markets/enforce"
import {
  createOntarioFormDraft,
  reviewOntarioFormDraft,
} from "@/lib/markets/ontario-forms"
import {
  assertCaslMarketingAllowed,
  getOntarioPrivacyLead,
  listOntarioBreaches,
  recordCaslMarketingConsent,
  recordOntarioBreach,
  setOntarioPrivacyLead,
  setOntarioRetentionRule,
  ONTARIO_BREACH_RETENTION_MONTHS,
} from "@/lib/markets/ontario-privacy"
import {
  ONTARIO_TENANT_CARD_FEE,
  ontarioResidentialDepositMonths,
} from "@/lib/markets/ontario-rta"
import { listingSitesForMarket } from "@/lib/import/listing-schema"
import { catalogEntryFor, ONTARIO_GO_LIVE_BLOCKERS } from "@/lib/markets/compliance-catalog"
import { createPropertyForLandlord, getDb } from "@/lib/db"
import { NEVER_AUTO_TOOLS } from "@/lib/mcp/policy"

installTempDatabase()

describe("Ontario RTA product enforcement", () => {
  it("allows residential; commercial own-flag OFF; sales always blocked", () => {
    expect(
      assertOntarioResidentialOnly({ iso: "CA", segment: "commercial" }).ok,
    ).toBe(false)
    expect(
      assertOntarioResidentialOnly({ iso: "CA", segment: "warehouse" }).ok,
    ).toBe(false)
    expect(
      assertOntarioResidentialOnly({ iso: "CA", segment: "residential" }).ok,
    ).toBe(true)
    expect(
      assertOntarioResidentialOnly({ iso: "CA", listingPurpose: "sale" }).ok,
    ).toBe(false)
    expect(
      assertOntarioResidentialOnly({ iso: "IN", segment: "commercial" }).ok,
    ).toBe(true)
    expect(catalogEntryFor("ontarioCommercialSales")?.hardLocked).toBe(true)
  })

  it("blocks scrape / MLS / DDF / Kijiji / LoopNet for CA (landlord-direct only)", () => {
    expect(assertOntarioListingImportAllowed({ iso: "CA", siteId: "realtor-ca" }).ok).toBe(
      false,
    )
    expect(assertOntarioListingImportAllowed({ iso: "CA", siteId: "loopnet-ca" }).ok).toBe(
      false,
    )
    expect(assertOntarioListingImportAllowed({ iso: "CA", siteId: "proptx" }).ok).toBe(false)
    expect(assertOntarioListingImportAllowed({ iso: "CA", siteId: "ddf" }).ok).toBe(false)
    expect(assertOntarioListingImportAllowed({ iso: "CA", siteId: "kijiji" }).ok).toBe(false)
    expect(listingSitesForMarket("CA").some((s) => s.market === "CA")).toBe(false)
    expect(listingSitesForMarket("CA").some((s) => s.id === "nobroker")).toBe(true)
    expect(catalogEntryFor("ontarioMlsImport")?.hardLocked).toBe(true)
  })

  it("caps LMR at one month and blocks damage deposits", () => {
    expect(ontarioResidentialDepositMonths("CA", 2).ok).toBe(false)
    expect(ontarioResidentialDepositMonths("CA", 1).ok).toBe(true)
    expect(
      assertOntarioDepositAllowed({ iso: "CA", kind: "damage", months: 1 }).ok,
    ).toBe(false)
    expect(
      assertOntarioDepositAllowed({
        iso: "CA",
        kind: "key",
        amountCents: 5000,
        costCents: 4000,
      }).ok,
    ).toBe(false)
    expect(
      assertOntarioDepositAllowed({
        iso: "CA",
        kind: "key",
        amountCents: 4000,
        costCents: 4000,
      }).ok,
    ).toBe(true)
  })

  it("keeps PAD optional and tenant card fee hard OFF", () => {
    expect(assertOntarioPadOptional({ iso: "CA", padRequired: true }).ok).toBe(false)
    expect(assertOntarioPadOptional({ iso: "CA", padRequired: false }).ok).toBe(true)
    expect(
      assertOntarioTenantCardFeeOff({ iso: "CA", chargingTenantCardFee: true }).ok,
    ).toBe(false)
    expect(ONTARIO_TENANT_CARD_FEE.label).toMatch(/Disabled by product policy/)
    expect(catalogEntryFor("caTenantCardFee")?.hardLocked).toBe(true)
    expect(catalogEntryFor("ontarioAutomatedEviction")?.hardLocked).toBe(true)
  })

  it("requires human review for Ontario forms and blocks auto eviction", () => {
    const created = createOntarioFormDraft({
      tenantId: "t_bbm",
      countryIso: "CA",
      formKind: "ltb_n_form",
      formId: "N4",
      unitId: "u_demo",
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(
      assertOntarioFormHumanReview({
        iso: "CA",
        draft: created.draft,
        intent: "send",
      }).ok,
    ).toBe(false)
    const reviewed = reviewOntarioFormDraft({
      tenantId: "t_bbm",
      draftId: created.draft.id,
      reviewerUserId: "u_nadia",
      decision: "approved",
    })
    expect(reviewed.ok).toBe(true)
    if (!reviewed.ok) return
    expect(
      assertOntarioFormHumanReview({
        iso: "CA",
        draft: reviewed.draft,
        intent: "send",
      }).ok,
    ).toBe(true)
    expect(assertOntarioNoAutomatedEviction("CA").ok).toBe(false)
    expect(assertOntarioFormHumanReview({ iso: "CA", draft: reviewed.draft, intent: "evict_auto" }).ok).toBe(
      false,
    )
    expect(NEVER_AUTO_TOOLS.has("automate_eviction")).toBe(true)
  })

  it("stores PIPEDA privacy lead, retention, 24mo breach register, and CASL consent", () => {
    expect(ONTARIO_BREACH_RETENTION_MONTHS).toBe(24)
    const lead = setOntarioPrivacyLead({
      tenantId: "t_bbm",
      name: "Demo Privacy Lead",
      email: "privacy@example.test",
      countryIso: "CA",
    })
    expect(lead.ok).toBe(true)
    expect(getOntarioPrivacyLead("t_bbm")?.email).toBe("privacy@example.test")
    expect(
      setOntarioRetentionRule({
        tenantId: "t_bbm",
        retentionMonths: 24,
        deletionPolicy: "Anonymize inactive applicant PII after 24 months unless legal hold.",
      }).ok,
    ).toBe(true)
    const breach = recordOntarioBreach({
      tenantId: "t_bbm",
      summary: "Synthetic demo breach register entry",
      discoveredAt: new Date().toISOString(),
      synthetic: true,
    })
    expect(breach.ok).toBe(true)
    expect(listOntarioBreaches("t_bbm").length).toBeGreaterThan(0)
    expect(assertCaslMarketingAllowed({ iso: "CA", email: "prospect@example.test" }).ok).toBe(
      false,
    )
    recordCaslMarketingConsent({ email: "prospect@example.test", granted: true })
    expect(assertOntarioCaslMarketing({ iso: "CA", email: "prospect@example.test" }).ok).toBe(
      true,
    )
  })

  it("rejects CA commercial property create at DB write", () => {
    getDb()
      .prepare(
        `INSERT OR REPLACE INTO tenants
          (id, name, slug, city, kind, display_currency, package, status, is_demo, country_iso)
         VALUES ('t_on_demo', 'Ontario Demo LL', 'ontario-demo-ll', 'Toronto', 'landlord', 'CAD', 'starter', 'active', 1, 'CA')`,
      )
      .run()
    const blocked = createPropertyForLandlord({
      tenantId: "t_on_demo",
      name: "Blocked commercial",
      address: "1 King St W",
      area: "Downtown",
      cityLine: "TORONTO · ON",
      segment: "commercial",
      subtype: "office",
      totalSqft: 1200,
    })
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.error).toMatch(/residential/i)
    const okResidential = createPropertyForLandlord({
      tenantId: "t_on_demo",
      name: "Rosedale flat",
      address: "2 Elm Ave",
      area: "Rosedale",
      cityLine: "TORONTO · ON",
      segment: "residential",
      subtype: "apartment",
      totalSqft: 900,
      unit: {
        code: "2A",
        description: "Bright 2BR",
        sqft: 900,
        rateBasis: "flat_month",
        rentAmountMinor: 240000,
        attributes: { bhk: 2, furnishing: "semi", societyAmenities: [] },
        bhk: 2,
        carpetSqft: 850,
        securityDepositMonths: 1,
        gstApplicable: false,
      },
    })
    expect(okResidential.ok).toBe(true)
    expect(ONTARIO_GO_LIVE_BLOCKERS.every((b) => b.done === false)).toBe(true)
  })
})
