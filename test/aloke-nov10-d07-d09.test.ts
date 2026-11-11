import { beforeEach, describe, expect, it } from "vitest"
import { useTempDatabase } from "./helpers/temp-db"
import {
  ALOKE_NOV10_LOCKS,
  LANDLORD_PERCENT_FEE_SCHEDULE,
  assertDepositHoldingHardOff,
  assertNoGlobalGoLive,
  assertRentCollectAtLaunchOff,
} from "@/lib/billing/aloke-nov10-locks"
import { ontarioCommercialRuntimeAllowed } from "@/lib/markets/ontario-rta"
import {
  assertDirectChargeOnly,
  assertRentNeverOnDeskulptBooks,
} from "@/lib/billing/cfo-hard-invariants"
import {
  DUAL_CONTROL_APPROVER_DAILY_CAP_CAD_CENTS,
  DUAL_CONTROL_FINANCE_POLICY_VERSION,
  DUAL_CONTROL_REFUND_THRESHOLD_CAD_CENTS,
  requiresDualControl,
} from "@/lib/billing/dual-control"
import { deskulptCanadaAppFeeTaxIdentity } from "@/lib/billing/invoice-tax-identity"
import { D13_LEGAL_WORDING, depositHoldsRuntimeAllowed } from "@/lib/billing/legal-flags"
import { catalogEntryFor } from "@/lib/markets/compliance-catalog"
import {
  exchangeMcpAuthCode,
  issueMcpAuthCode,
  mcpPkceEnabled,
  mcpProtectedResourceMetadata,
  pkceChallengeS256,
  proposalBindFields,
} from "@/lib/mcp"
import { adminRequestEnableFlag, ensureLegalFlagOverridesRegistered } from "@/lib/markets/legal-overrides"

useTempDatabase()

describe("Aloke Nov10 locks + D07/D09 alignment", () => {
  beforeEach(() => {
    delete process.env.EASYRENTAL_MCP_OAUTH_PKCE
  })

  it("locks deposit holding hard OFF; no rent collect; no global go-live", () => {
    expect(ALOKE_NOV10_LOCKS.depositHoldingHardOff).toBe(true)
    expect(ALOKE_NOV10_LOCKS.rentCollectAtLaunch).toBe(false)
    expect(ALOKE_NOV10_LOCKS.globalGoLive).toBe(false)
    expect(ALOKE_NOV10_LOCKS.commercialFlag).toBe(false)
    expect(ontarioCommercialRuntimeAllowed()).toBe(false)
    expect(ALOKE_NOV10_LOCKS.feePayer).toBe("landlord_paid_percent")
    expect(LANDLORD_PERCENT_FEE_SCHEDULE.capped).toBe(true)
    expect(LANDLORD_PERCENT_FEE_SCHEDULE.live).toBe(false)
    expect(LANDLORD_PERCENT_FEE_SCHEDULE.numericScheduleStatus).toBe(
      "pending_with_price_list",
    )
    expect(LANDLORD_PERCENT_FEE_SCHEDULE.percentBps).toBeNull()
    expect(assertDepositHoldingHardOff(true).ok).toBe(false)
    expect(assertDepositHoldingHardOff(false).ok).toBe(true)
    expect(assertRentCollectAtLaunchOff(true).ok).toBe(false)
    expect(assertNoGlobalGoLive(true).ok).toBe(false)
    expect(depositHoldsRuntimeAllowed()).toBe(false)
    expect(catalogEntryFor("depositHolds")?.hardLocked).toBe(true)
  })

  it("hard-locks depositHolds enable in compliance console", () => {
    ensureLegalFlagOverridesRegistered()
    const blocked = adminRequestEnableFlag({
      iso: "CA",
      key: "depositHolds",
      actorUserId: "u_platform_admin",
    })
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.code).toBe("hard_locked")
  })

  it("locks refund dual-control CAD500 / 1mo and CAD2k/day (non-weakenable)", () => {
    expect(DUAL_CONTROL_REFUND_THRESHOLD_CAD_CENTS).toBe(50_000)
    expect(DUAL_CONTROL_APPROVER_DAILY_CAP_CAD_CENTS).toBe(200_000)
    expect(DUAL_CONTROL_FINANCE_POLICY_VERSION).toBe("2026-11-10")
    const above = requiresDualControl({
      action: "large_refund",
      amountCadCents: 50_001,
    })
    expect(above.required).toBe(true)
    expect(above.alokeThresholdsLocked).toBe(true)
    expect(above.engControlsReady).toBe(true)
    expect(above.liveMoneyReady).toBe(false)
    expect(above.productionReady).toBe(false)
    // Cannot weaken by passing a higher threshold.
    const weaken = requiresDualControl({
      action: "large_refund",
      amountCadCents: 60_000,
      thresholdCadCents: 100_000,
    })
    expect(weaken.required).toBe(true)
    expect(weaken.thresholdCadCents).toBe(50_000)
    const oneMo = requiresDualControl({
      action: "large_refund",
      amountCadCents: 40_000,
      oneMonthSubscriptionCadCents: 30_000,
    })
    expect(oneMo.required).toBe(true)
    expect(requiresDualControl({ action: "deposit_release" }).required).toBe(true)
  })

  it("CFO HARD: DIRECT only; rent never Deskulpt; tax identity day one", () => {
    expect(
      assertDirectChargeOnly({
        chargeType: "destination",
        stripeBody: { transfer_data: { destination: "acct_x" } },
      }).ok,
    ).toBe(false)
    expect(assertDirectChargeOnly({ chargeType: "direct", stripeBody: {} }).ok).toBe(true)
    expect(
      assertRentNeverOnDeskulptBooks({
        rentSettlementAccount: "deskulpt_platform",
      }).ok,
    ).toBe(false)
    expect(
      assertRentNeverOnDeskulptBooks({
        rentSettlementAccount: "landlord_connected",
        depositHeldByDeskulpt: true,
      }).ok,
    ).toBe(false)
    const id = deskulptCanadaAppFeeTaxIdentity({ customerProvinceOrState: "ON" })
    expect(id.customerCountry).toBe("CA")
    expect(id.taxRegistrationId).toBeTruthy()
    expect(id.issuingLegalEntity).toContain("Deskulpt")
  })

  it("D13 wording: India demo only; CA/ON Stripe first", () => {
    expect(D13_LEGAL_WORDING).toContain("India demo only")
    expect(D13_LEGAL_WORDING).toMatch(/Canada\/Ontario on Stripe/)
    expect(D13_LEGAL_WORDING).not.toContain("Telangana and Ontario selected")
  })

  it("D07 PKCE stays OFF by default; protected-resource metadata honest", () => {
    expect(mcpPkceEnabled()).toBe(false)
    const meta = mcpProtectedResourceMetadata()
    expect(meta.certified_hosts).toEqual([])
    expect(meta.resource).toBe("easyrental.mcp")
  })

  it("D07 auth-code + PKCE issues and exchanges when flag ON", () => {
    process.env.EASYRENTAL_MCP_OAUTH_PKCE = "1"
    const verifier = "test-verifier-aloke-nov10-pkce-abcdef"
    const challenge = pkceChallengeS256(verifier)
    const issued = issueMcpAuthCode({
      userId: "u_nadia",
      tenantId: "t_bbm",
      clientId: "cursor-mcp",
      redirectUri: "http://127.0.0.1/cb",
      codeChallenge: challenge,
      scopes: ["read:*"],
    })
    expect(issued.ok).toBe(true)
    if (!issued.ok) return
    const bad = exchangeMcpAuthCode({
      code: issued.code,
      clientId: "cursor-mcp",
      redirectUri: "http://127.0.0.1/cb",
      codeVerifier: "wrong",
    })
    expect(bad.ok).toBe(false)
    const ok = exchangeMcpAuthCode({
      code: issued.code,
      clientId: "cursor-mcp",
      redirectUri: "http://127.0.0.1/cb",
      codeVerifier: verifier,
    })
    expect(ok.ok).toBe(true)
    // replay blocked
    const replay = exchangeMcpAuthCode({
      code: issued.code,
      clientId: "cursor-mcp",
      redirectUri: "http://127.0.0.1/cb",
      codeVerifier: verifier,
    })
    expect(replay.ok).toBe(false)
  })

  it("D09 bind fields expose amount / payee / scope / text", () => {
    const bind = proposalBindFields({
      id: "p1",
      tenantId: "t_bbm",
      toolName: "propose_job_assignment",
      payload: {
        propertyId: "p_waterman",
        providerId: "u_provider",
        amountCadCents: 12_000,
      } as never,
      status: "pending",
      promptSummary: "assign plumber",
      createdBy: "u_nadia",
      createdAt: "2026-11-10T00:00:00.000Z",
      decidedBy: null,
      decidedAt: null,
      outcomeJson: null,
      error: null,
      expiresAt: null,
      bindingHash: null,
      amountCadCents: 12_000,
    })
    expect(bind.amountCadCents).toBe(12_000)
    expect(bind.payee).toBe("u_provider")
    expect(bind.scope).toContain("t_bbm")
    expect(bind.text).toBe("assign plumber")
  })
})
