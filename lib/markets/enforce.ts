/**
 * Fail-closed enforcement for CountryPack LEGAL flags + country data scope.
 * Call at real checkout / model / API sites — not only in config modules.
 *
 * dataResidency on packs is **declarative** until storage/region pinning lands;
 * do not treat notes as an enforcement boundary.
 */

import { normalizeMarketIso } from "@/lib/markets/cookie"
import {
  assertAccountCountryMatch,
  isValidAccountCountry,
} from "@/lib/markets/account-country"
import { assertAiPiiAllowed } from "@/lib/markets/ai-policy"
import { legalFlag, type LegalFeatureFlagKey } from "@/lib/markets/legal-flags"
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
