/**
 * Ontario residential (RTA) product policy — CA pack only.
 * Demo/staging scope per docs/ontario-demo-approval-nov7.md + Aloke Nov10.
 * Hard rules live here; toggleable LEGAL flags stay in legal-flags.ts.
 *
 * Aloke Nov10: residential AND commercial build; commercial behind own flag
 * (OFF until counsel); residential RTA protections un-bypassable; direct
 * landlord listings only (no scrape / MLS / DDF).
 */

import { ALOKE_NOV10_LOCKS } from "@/lib/billing/aloke-nov10-locks"
import type { ListingSiteId } from "@/lib/import/listing-schema"
import type { PropertySegment } from "@/lib/listing-schemas"

/** Always allowed in Ontario — RTA residential protections never bypassable. */
export const ONTARIO_ALLOWED_SEGMENTS: readonly PropertySegment[] = ["residential"]

/**
 * Commercial / warehouse segments — gated by `ontarioCommercialRuntimeAllowed()`
 * (Aloke Nov10 own flag; OFF until counsel + code release).
 */
export const ONTARIO_COMMERCIAL_SEGMENTS: readonly PropertySegment[] = [
  "warehouse",
  "commercial",
]

/** @deprecated Prefer ONTARIO_COMMERCIAL_SEGMENTS + ontarioCommercialRuntimeAllowed. */
export const ONTARIO_BLOCKED_SEGMENTS: readonly PropertySegment[] = ONTARIO_COMMERCIAL_SEGMENTS

/** Scrape / board import paths — landlord-direct only (Aloke Nov10 / D15). */
export const ONTARIO_BLOCKED_LISTING_IMPORT_SITES: readonly ListingSiteId[] = [
  "realtor-ca",
  "loopnet-ca",
  "kijiji",
]

/** Extra scrape identifiers that must never be enabled for Ontario (no adapters yet). */
export const ONTARIO_BLOCKED_IMPORT_ALIASES = [
  "mls",
  "proptx",
  "ddf",
  "crea-ddf",
  "realtor.ca",
  "realtor-ca",
  "kijiji",
  "treb",
  "crea",
] as const

/** Last month's rent deposit — max one month; interest tracked separately. */
export const ONTARIO_LMR_MAX_MONTHS = 1

/** Damage / security deposits are not allowed under Ontario RTA for residential. */
export const ONTARIO_DAMAGE_DEPOSITS_ALLOWED = false

/** PAD is optional for tenants — never required to apply or pay rent. */
export const ONTARIO_PAD_REQUIRED = false

/**
 * Hard product lock — not a LEGAL_FEATURE_FLAGS toggle.
 * Label per Aloke + Legal + CFO (2026-11-07).
 */
export const ONTARIO_TENANT_CARD_FEE = {
  enabled: false as const,
  hardLocked: true as const,
  label: "Disabled by product policy; Ontario residential legal risk",
  code: "caTenantCardFee",
}

/** Official LTB N-forms only (demo catalog — not automated filing). */
export const ONTARIO_LTB_N_FORMS = [
  { id: "N4", name: "Notice to End a Tenancy Early for Non-payment of Rent" },
  { id: "N5", name: "Notice to End a Tenancy Early for Interfering / Damage / Overcrowding" },
  { id: "N6", name: "Notice to End a Tenancy Early — Illegal Act / Misrepresentation of Income" },
  { id: "N7", name: "Notice to End a Tenancy Early for Causing Serious Impairment of Safety" },
  { id: "N8", name: "Notice to End a Tenancy at the End of a Term" },
  { id: "N12", name: "Notice to End your Tenancy Because the Landlord / Purchaser / Family Requires the Rental Unit" },
  { id: "N13", name: "Notice to End your Tenancy Because the Landlord Wants to Demolish / Convert / Repair" },
] as const

export type OntarioLtbFormId = (typeof ONTARIO_LTB_N_FORMS)[number]["id"]

export const ONTARIO_STANDARD_LEASE_TEMPLATE_ID = "on-standard-lease"

/** Automated eviction is permanently OFF — human review + official forms only. */
export const ONTARIO_AUTOMATED_EVICTION_ALLOWED = false

/** Go-live blockers — always unchecked in demo/staging console. */
export const ONTARIO_GO_LIVE_BLOCKERS = [
  { id: "on_lawyer_review", label: "Ontario lawyer written review" },
  { id: "stripe_money_flow_rpaa", label: "Stripe money-flow doc plus RPAA/FINTRAC determination" },
  { id: "listing_rights", label: "Listing rights" },
  { id: "rta_privacy_demo", label: "RTA and privacy controls demonstrated" },
] as const

export function isOntarioMarket(iso: string | null | undefined): boolean {
  return String(iso ?? "")
    .trim()
    .toUpperCase() === "CA"
}

/**
 * Aloke Nov10 commercial own-flag — hard OFF until counsel + code release.
 * Mirrors depositHoldsRuntimeAllowed: not a soft console toggle.
 * Catalog key `ontarioCommercialSales` stays hardLocked.
 */
export function ontarioCommercialRuntimeAllowed(): boolean {
  // Keep lock constant referenced so product policy and runtime stay aligned.
  return ALOKE_NOV10_LOCKS.commercialFlag
}

export function ontarioAllowsSegment(
  iso: string | null | undefined,
  segment: string,
): boolean {
  if (!isOntarioMarket(iso)) return true
  if ((ONTARIO_ALLOWED_SEGMENTS as readonly string[]).includes(segment)) return true
  if ((ONTARIO_COMMERCIAL_SEGMENTS as readonly string[]).includes(segment)) {
    return ontarioCommercialRuntimeAllowed()
  }
  return false
}

export function ontarioBlocksListingImportSite(
  iso: string | null | undefined,
  siteId: string,
): boolean {
  if (!isOntarioMarket(iso)) return false
  const needle = siteId.trim().toLowerCase()
  if ((ONTARIO_BLOCKED_LISTING_IMPORT_SITES as readonly string[]).includes(needle)) {
    return true
  }
  return (ONTARIO_BLOCKED_IMPORT_ALIASES as readonly string[]).some(
    (alias) => alias === needle || needle.includes(alias),
  )
}

export function ontarioResidentialDepositMonths(
  iso: string | null | undefined,
  requestedMonths: number | null | undefined,
): { ok: true; months: number; kind: "last_months_rent" } | { ok: false; error: string; code: string } {
  if (!isOntarioMarket(iso)) {
    const months = requestedMonths ?? 0
    return { ok: true, months, kind: "last_months_rent" }
  }
  if (requestedMonths == null || !Number.isFinite(requestedMonths)) {
    return {
      ok: true,
      months: ONTARIO_LMR_MAX_MONTHS,
      kind: "last_months_rent",
    }
  }
  if (requestedMonths <= 0) {
    return {
      ok: false,
      code: "ontario_deposit_required_shape",
      error:
        "Ontario residential uses last month's rent deposit (≤ one month), not a zero or damage deposit.",
    }
  }
  if (requestedMonths > ONTARIO_LMR_MAX_MONTHS) {
    return {
      ok: false,
      code: "ontario_lmr_cap",
      error: `Ontario last month's rent deposit cannot exceed ${ONTARIO_LMR_MAX_MONTHS} month of rent.`,
    }
  }
  return { ok: true, months: requestedMonths, kind: "last_months_rent" }
}

export function ontarioKeyDepositAllowed(input: {
  iso: string | null | undefined
  amountCents: number
  costCents: number
}): { ok: true } | { ok: false; error: string; code: string } {
  if (!isOntarioMarket(input.iso)) return { ok: true }
  if (input.amountCents < 0 || input.costCents < 0) {
    return { ok: false, code: "ontario_key_deposit_invalid", error: "Key deposit amounts must be non-negative." }
  }
  if (input.amountCents > input.costCents) {
    return {
      ok: false,
      code: "ontario_key_deposit_over_cost",
      error: "Ontario key deposits must be refundable at cost only — amount cannot exceed key cost.",
    }
  }
  return { ok: true }
}

export function isOfficialOntarioLtbForm(formId: string): boolean {
  return ONTARIO_LTB_N_FORMS.some((f) => f.id === formId.toUpperCase())
}
