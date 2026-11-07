/**
 * Deskulpt Inc tax identity (Canada).
 * Reads CA CountryPack (`taxRegistrationId` / `legalEntity`) — same source as #47.
 * Do not hardcode a second copy of the registration id here.
 * Feature flags for live Connect / Stripe Tax remain OFF.
 */

import { CANADA_PACK } from "@/lib/markets/packs"

export const DESKULPT_CANADA_LEGAL_NAME = (CANADA_PACK.legalEntity ??
  "Deskulpt Inc") as "Deskulpt Inc"

/** Federal GST/HST registration — from CANADA_PACK.taxRegistrationId (PRD → pack). */
export const DESKULPT_CANADA_GST_HST_NUMBER = CANADA_PACK.taxRegistrationId as string

if (!DESKULPT_CANADA_GST_HST_NUMBER?.trim()) {
  throw new Error("CANADA_PACK.taxRegistrationId missing — sync with CountryPack CA (#47)")
}

export const DESKULPT_CANADA_TAX = {
  legalName: DESKULPT_CANADA_LEGAL_NAME,
  gstHstNumber: DESKULPT_CANADA_GST_HST_NUMBER,
  gstHstNumberResolved: true as const,
  /** Pack is source of truth; billing helpers read pack, not a parallel constant. */
  source: "canada_pack.taxRegistrationId" as const,
  hstBpsOntario: CANADA_PACK.gstBps,
  labelledDemo: true as const,
} as const

export type LandlordMonthlyStatementTaxBlock = {
  sellerLegalName: typeof DESKULPT_CANADA_LEGAL_NAME
  gstHstNumber: string
  hstBps: number
  hstCadCents: number
  applicationFeeExclusiveCadCents: number
  applicationFeeInclusiveCadCents: number
}

/** Tax block for Ontario landlord monthly statements / application-fee lines. */
export function landlordStatementTaxBlock(input: {
  applicationFeeExclusiveCadCents: number
  hstBps?: number
}): LandlordMonthlyStatementTaxBlock {
  const exclusive = Math.max(0, Math.round(input.applicationFeeExclusiveCadCents))
  const hstBps = input.hstBps ?? DESKULPT_CANADA_TAX.hstBpsOntario
  const hstCadCents = Math.round((exclusive * hstBps) / 10_000)
  return {
    sellerLegalName: DESKULPT_CANADA_LEGAL_NAME,
    gstHstNumber: DESKULPT_CANADA_GST_HST_NUMBER,
    hstBps,
    hstCadCents,
    applicationFeeExclusiveCadCents: exclusive,
    applicationFeeInclusiveCadCents: exclusive + hstCadCents,
  }
}
