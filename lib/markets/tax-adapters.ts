/**
 * Per-country tax adapters — gated via LEGAL_FEATURE_FLAGS (fail-closed).
 * CA: Stripe Tax / HST · IN: tax matrix. Synthetic demo math may use pack gstBps labels only.
 */

import { legalFlag } from "@/lib/markets/legal-flags"
import { builtinPack } from "@/lib/markets/packs"
import type { CountryPack } from "@/lib/markets/types"

export type TaxAdapterKind = "ca_stripe_tax_hst" | "in_gst_matrix" | "labels_only"

export type TaxAdapterResult =
  | {
      ok: true
      kind: TaxAdapterKind
      taxableMinor: number
      taxMinor: number
      label: string
      taxRegistrationId?: string
    }
  | { ok: false; reason: string; kind: TaxAdapterKind }

export function taxAdapterKindForPack(pack: CountryPack): TaxAdapterKind {
  return pack.taxAdapter?.kind ?? "labels_only"
}

/** Pack tax registration for landlord statements — available even while tax adapter flag is OFF. */
export function taxRegistrationIdForIso(iso: string, pack?: CountryPack | null): string | null {
  const resolved = pack ?? builtinPack(iso)
  const id = resolved?.taxRegistrationId?.trim()
  return id ? id : null
}

/**
 * Compute tax when the country adapter flag is ON.
 * Fail-closed: returns labels_only reason when gated OFF (never invent live tax).
 */
export function computeCountryTax(input: {
  iso: string
  taxableMinor: number
  pack?: CountryPack | null
}): TaxAdapterResult {
  const pack = input.pack ?? builtinPack(input.iso)
  if (!pack) {
    return { ok: false, reason: "Unknown country pack", kind: "labels_only" }
  }
  const kind = taxAdapterKindForPack(pack)
  if (kind === "ca_stripe_tax_hst") {
    if (!legalFlag(pack.iso, "caStripeTaxHst", pack)) {
      return {
        ok: false,
        reason: "CA Stripe Tax/HST adapter gated OFF (Legal/Finance)",
        kind,
      }
    }
    // Placeholder until Stripe Tax wiring — still uses pack bps when explicitly enabled.
    const taxMinor = Math.round((input.taxableMinor * pack.gstBps) / 10_000)
    return {
      ok: true,
      kind,
      taxableMinor: input.taxableMinor,
      taxMinor,
      label: pack.taxLabels[0] ?? "HST",
      taxRegistrationId: pack.taxRegistrationId,
    }
  }
  if (kind === "in_gst_matrix") {
    if (!legalFlag(pack.iso, "inTaxMatrix", pack)) {
      return {
        ok: false,
        reason: "IN tax matrix gated OFF pending tax specialist",
        kind,
      }
    }
    const taxMinor = Math.round((input.taxableMinor * pack.gstBps) / 10_000)
    return {
      ok: true,
      kind,
      taxableMinor: input.taxableMinor,
      taxMinor,
      label: pack.taxLabels[0] ?? "GST",
      taxRegistrationId: pack.taxRegistrationId,
    }
  }
  return { ok: false, reason: "No live tax adapter for pack", kind: "labels_only" }
}
