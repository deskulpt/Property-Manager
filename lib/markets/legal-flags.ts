/**
 * LEGAL_FEATURE_FLAGS — per-country, fail-closed (never-auto).
 * Live enablement requires explicit true on the CountryPack + Aloke/Legal gates.
 * Does not Aloke-approve D11/D12/D13/D15.
 */

import { builtinPack } from "@/lib/markets/packs"
import type { CountryPack } from "@/lib/markets/types"

export const LEGAL_FEATURE_FLAG_KEYS = [
  "ontarioConnectDirectPad",
  "caStripeTaxHst",
  "inTaxMatrix",
  "razorpayIndianEntity",
  "routeHolds",
  "depositHolds",
  "onStandardLeaseLive",
  "tgProductionLease",
  "mandatoryTenantSurcharge",
  "eStore",
  "concierge",
  "affiliate",
  /** Real PII through AI connectors/media — OFF until data-handling review. */
  "realPiiAiConnectorsMedia",
] as const

export type LegalFeatureFlagKey = (typeof LEGAL_FEATURE_FLAG_KEYS)[number]

export type LegalFeatureFlags = Record<LegalFeatureFlagKey, boolean>

/** Fail-closed defaults — every flag OFF until pack + counsel turn it on. */
export const LEGAL_FEATURE_FLAGS_OFF: LegalFeatureFlags = {
  ontarioConnectDirectPad: false,
  caStripeTaxHst: false,
  inTaxMatrix: false,
  razorpayIndianEntity: false,
  routeHolds: false,
  depositHolds: false,
  onStandardLeaseLive: false,
  tgProductionLease: false,
  mandatoryTenantSurcharge: false,
  eStore: false,
  concierge: false,
  affiliate: false,
  realPiiAiConnectorsMedia: false,
}

export function resolveLegalFlags(pack: CountryPack | null | undefined): LegalFeatureFlags {
  const merged: LegalFeatureFlags = { ...LEGAL_FEATURE_FLAGS_OFF }
  if (!pack?.legalFeatureFlags) return merged
  for (const key of LEGAL_FEATURE_FLAG_KEYS) {
    if (pack.legalFeatureFlags[key] === true) merged[key] = true
  }
  return merged
}

/** Fail-closed: true only when pack explicitly sets the flag. */
export function legalFlag(iso: string, key: LegalFeatureFlagKey, pack?: CountryPack | null): boolean {
  const resolved = pack ?? builtinPack(iso)
  return resolveLegalFlags(resolved)[key] === true
}

export function assertLegalFlagOff(iso: string, key: LegalFeatureFlagKey): void {
  if (legalFlag(iso, key)) {
    throw new Error(`LEGAL_FEATURE_FLAGS.${key} unexpectedly ON for ${iso}`)
  }
}
