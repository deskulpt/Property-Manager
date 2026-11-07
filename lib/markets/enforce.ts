/**
 * Fail-closed enforcement for CountryPack LEGAL flags + country data scope.
 * Call at real checkout / model / API sites — not only in config modules.
 *
 * dataResidency on packs is **declarative** until storage/region pinning lands;
 * do not treat notes as an enforcement boundary.
 *
 * Ontario RTA product rules (residential-only, deposits, forms, imports) live in
 * ontario-rta / ontario-forms / ontario-privacy and are re-exported here so call
 * sites stay on one enforce surface.
 */

import { normalizeMarketIso } from "@/lib/markets/cookie"
import {
  assertAccountCountryMatch,
  isValidAccountCountry,
} from "@/lib/markets/account-country"
import { assertAiPiiAllowed } from "@/lib/markets/ai-policy"
import { legalFlag, type LegalFeatureFlagKey } from "@/lib/markets/legal-flags"
import {
  assertOntarioAutomatedEvictionBlocked,
  assertOntarioFormSendAllowed,
  type OntarioFormDraft,
} from "@/lib/markets/ontario-forms"
import { assertCaslMarketingAllowed } from "@/lib/markets/ontario-privacy"
import {
  isOntarioMarket,
  ontarioAllowsSegment,
  ontarioBlocksListingImportSite,
  ontarioKeyDepositAllowed,
  ontarioResidentialDepositMonths,
  ONTARIO_DAMAGE_DEPOSITS_ALLOWED,
  ONTARIO_PAD_REQUIRED,
  ONTARIO_TENANT_CARD_FEE,
} from "@/lib/markets/ontario-rta"
import {
  canUseOntarioConnectDirectPad,
  canUseRazorpayIndianEntity,
} from "@/lib/markets/payment-rails"
import { pathSegmentForIso } from "@/lib/markets/path-segments"
import { builtinPack } from "@/lib/markets/packs"
import { taxRegistrationIdForIso } from "@/lib/markets/tax-adapters"

export type EnforceOk = { ok: true }
export type EnforceErr = { ok: false; error: string; code: string }

/** Declarative-only — returns notes; never blocks. Storage enforcement TBD. */
export function dataResidencyDeclarative(iso: string): {
  declarative: true
  region: string | null
  notes: string | null
  enforcedByStorage: false
} {
  const pack = builtinPack(iso)
  return {
    declarative: true,
    region: pack?.dataResidency?.region ?? null,
    notes: pack?.dataResidency?.notes ?? null,
    enforcedByStorage: false,
  }
}

export function assertLegalFlagOn(
  iso: string,
  key: LegalFeatureFlagKey,
): EnforceOk | EnforceErr {
  if (legalFlag(iso, key)) return { ok: true }
  return {
    ok: false,
    code: "legal_flag_off",
    error: `LEGAL_FEATURE_FLAGS.${key} is OFF for ${normalizeMarketIso(iso)} (fail-closed).`,
  }
}

/** Block non-demo Razorpay Indian-entity rails until flag ON. */
export function assertRazorpayCheckoutAllowed(iso: string): EnforceOk | EnforceErr {
  if (canUseRazorpayIndianEntity(iso)) return { ok: true }
  return {
    ok: false,
    code: "razorpay_gated",
    error:
      "Razorpay Indian-entity rail is OFF until Deskulpt Commerce India Pvt Ltd + written acceptance + Legal.",
  }
}

/** Block Ontario Connect DIRECT+PAD until flag ON. */
export function assertOntarioConnectPadAllowed(iso: string): EnforceOk | EnforceErr {
  if (canUseOntarioConnectDirectPad(iso)) return { ok: true }
  return {
    ok: false,
    code: "connect_pad_gated",
    error: "ontarioConnectDirectPad is OFF pending Legal ON tenant-fee / provider-reg gates.",
  }
}

/**
 * Cross-country data scope — **no L0/L1 bypass** (CTO #47).
 * Platform staff must operate inside the active country path segment.
 */
export function assertCountryDataScope(input: {
  requestIso: string
  resourceIso: string | null | undefined
  label?: string
}): EnforceOk | EnforceErr {
  const request = normalizeMarketIso(input.requestIso)
  const resource = normalizeMarketIso(input.resourceIso ?? request)
  if (!isValidAccountCountry(request)) {
    return { ok: false, code: "unknown_country", error: "Unknown request country pack." }
  }
  if (resource !== request) {
    return {
      ok: false,
      code: "cross_country_blocked",
      error: `Cross-country data blocked (${input.label ?? "resource"} is ${resource}; request is /${pathSegmentForIso(request)}).`,
    }
  }
  return { ok: true }
}

/** Login / session bind — same fail-closed rules for all roles including L0/L1. */
export function assertSessionCountry(input: {
  accountIso: string | null | undefined
  requestIso: string
}): EnforceOk | EnforceErr {
  const matched = assertAccountCountryMatch({
    accountIso: input.accountIso,
    requestIso: input.requestIso,
    roleLevel: 5, // force no platform bypass
  })
  if (!matched.ok) {
    return { ok: false, code: "account_country_mismatch", error: matched.error }
  }
  return { ok: true }
}

/** Live model / Ask Easy — real PII connectors blocked until flag ON. Stub/demo OK. */
export function assertLiveModelAllowed(iso: string): EnforceOk | EnforceErr {
  const gate = assertAiPiiAllowed(iso)
  if (gate.ok) return { ok: true }
  return { ok: false, code: "ai_pii_blocked", error: gate.error }
}

/** CA statement helper — registration id may be present while tax adapter stays OFF. */
export function caTaxRegistrationForStatements(iso = "CA"): string | null {
  return taxRegistrationIdForIso(iso)
}

/** RTA residential only — block commercial / warehouse / sales for Ontario (CA). */
export function assertOntarioResidentialOnly(input: {
  iso: string | null | undefined
  segment?: string | null
  listingPurpose?: "rent" | "sale" | string | null
}): EnforceOk | EnforceErr {
  if (!isOntarioMarket(input.iso)) return { ok: true }
  const purpose = String(input.listingPurpose ?? "rent").toLowerCase()
  if (purpose === "sale" || purpose === "sell" || purpose === "sales") {
    return {
      ok: false,
      code: "ontario_sales_blocked",
      error:
        "Ontario EasyRental is RTA residential rentals only (TRESA s5(1)(j) — no sales brokerage).",
    }
  }
  if (input.segment && !ontarioAllowsSegment(input.iso, input.segment)) {
    return {
      ok: false,
      code: "ontario_commercial_blocked",
      error:
        "Ontario demo/staging allows Residential Tenancies Act residential listings only — commercial and warehouse are blocked.",
    }
  }
  return { ok: true }
}

/** Landlord-direct listings only — block MLS / PropTx / REALTOR.ca / LoopNet imports. */
export function assertOntarioListingImportAllowed(input: {
  iso: string | null | undefined
  siteId: string
}): EnforceOk | EnforceErr {
  if (!ontarioBlocksListingImportSite(input.iso, input.siteId)) return { ok: true }
  return {
    ok: false,
    code: "ontario_import_blocked",
    error:
      "Ontario listings are landlord-direct only. MLS, PropTx, REALTOR.ca, and commercial board scrape/import paths are disabled.",
  }
}

/** Deposits: no damage deposits; LMR ≤ 1 month; key deposits at cost only. */
export function assertOntarioDepositAllowed(input: {
  iso: string | null | undefined
  kind: "last_months_rent" | "damage" | "security" | "key"
  months?: number | null
  amountCents?: number
  costCents?: number
}): EnforceOk | EnforceErr {
  if (!isOntarioMarket(input.iso)) return { ok: true }
  if (input.kind === "damage" || input.kind === "security") {
    if (!ONTARIO_DAMAGE_DEPOSITS_ALLOWED) {
      return {
        ok: false,
        code: "ontario_damage_deposit_blocked",
        error: "Ontario residential tenancies cannot collect damage or security deposits.",
      }
    }
  }
  if (input.kind === "last_months_rent" || input.kind === "security") {
    const capped = ontarioResidentialDepositMonths(input.iso, input.months ?? null)
    if (!capped.ok) return { ok: false, code: capped.code, error: capped.error }
  }
  if (input.kind === "key") {
    const key = ontarioKeyDepositAllowed({
      iso: input.iso,
      amountCents: input.amountCents ?? 0,
      costCents: input.costCents ?? 0,
    })
    if (!key.ok) return { ok: false, code: key.code, error: key.error }
  }
  return { ok: true }
}

/**
 * PAD is optional for tenants — never require autopay/PAD to proceed.
 * Connect DIRECT+PAD rail remains gated by ontarioConnectDirectPad.
 */
export function assertOntarioPadOptional(input: {
  iso: string | null | undefined
  padRequired?: boolean
}): EnforceOk | EnforceErr {
  if (!isOntarioMarket(input.iso)) return { ok: true }
  if (input.padRequired === true || ONTARIO_PAD_REQUIRED === true) {
    return {
      ok: false,
      code: "ontario_pad_not_required",
      error: "Ontario PAD / pre-authorized debit must stay optional for tenants — never required.",
    }
  }
  return { ok: true }
}

/** Tenant card convenience fees — hard OFF (product policy + RTA s134). */
export function assertOntarioTenantCardFeeOff(input: {
  iso: string | null | undefined
  chargingTenantCardFee?: boolean
}): EnforceOk | EnforceErr {
  if (!isOntarioMarket(input.iso)) return { ok: true }
  if (input.chargingTenantCardFee === true || ONTARIO_TENANT_CARD_FEE.enabled) {
    return {
      ok: false,
      code: "ontario_tenant_card_fee_locked",
      error: ONTARIO_TENANT_CARD_FEE.label,
    }
  }
  return { ok: true }
}

export function assertOntarioFormHumanReview(input: {
  iso: string | null | undefined
  draft: OntarioFormDraft | null
  intent?: "send" | "evict_auto"
}): EnforceOk | EnforceErr {
  return assertOntarioFormSendAllowed({
    countryIso: input.iso,
    draft: input.draft,
    intent: input.intent,
  })
}

export function assertOntarioNoAutomatedEviction(
  iso: string | null | undefined,
): EnforceOk | EnforceErr {
  return assertOntarioAutomatedEvictionBlocked(iso)
}

export function assertOntarioCaslMarketing(input: {
  iso: string | null | undefined
  email: string
}): EnforceOk | EnforceErr {
  return assertCaslMarketingAllowed(input)
}

/** Demo/staging: payments plane stays OFF unless a LEGAL/pay-plane flag is explicitly ON. */
export function assertOntarioPaymentsDemoOff(iso: string | null | undefined): EnforceOk | EnforceErr {
  if (!isOntarioMarket(iso)) return { ok: true }
  const pad = assertOntarioConnectPadAllowed(iso ?? "CA")
  if (!pad.ok) return pad
  return { ok: true }
}
