/**
 * Invoice / charge tax identity — day one fields (CFO HARD c).
 * Every charge/invoice records issuing entity, customer country/province,
 * business status, and GSTIN/BN. Live tax adapters stay gated elsewhere
 * (sibling CTO Eng priority: gated tax adapters — do not hardcode 18%).
 */

import {
  DESKULPT_CANADA_GST_HST_NUMBER,
  DESKULPT_CANADA_LEGAL_NAME,
} from "@/lib/billing/tax-identity"

export type BusinessStatus = "individual" | "business" | "unknown"

export type InvoiceTaxIdentityInput = {
  issuingLegalEntity: string
  customerCountry: string
  customerProvinceOrState?: string | null
  businessStatus: BusinessStatus
  /** GSTIN (IN) or BN / GST-HST # (CA) — required non-empty. */
  taxRegistrationId: string
  currency?: string
  labelledDemo?: boolean
}

export type InvoiceTaxIdentity = {
  issuingLegalEntity: string
  customerCountry: string
  customerProvinceOrState: string | null
  businessStatus: BusinessStatus
  taxRegistrationId: string
  currency: string
  labelledDemo: true
  policyVersion: "2026-11-10"
}

export function buildInvoiceTaxIdentity(input: InvoiceTaxIdentityInput): InvoiceTaxIdentity {
  const entity = input.issuingLegalEntity?.trim()
  const country = input.customerCountry?.trim().toUpperCase()
  const reg = input.taxRegistrationId?.trim()
  if (!entity) throw new Error("issuingLegalEntity required on every charge/invoice (CFO HARD c)")
  if (!country || country.length !== 2) {
    throw new Error("customerCountry (ISO-2) required on every charge/invoice (CFO HARD c)")
  }
  if (!reg) throw new Error("taxRegistrationId (GSTIN/BN) required on every charge/invoice (CFO HARD c)")
  if (
    input.businessStatus !== "individual" &&
    input.businessStatus !== "business" &&
    input.businessStatus !== "unknown"
  ) {
    throw new Error("businessStatus required on every charge/invoice (CFO HARD c)")
  }
  return {
    issuingLegalEntity: entity,
    customerCountry: country,
    customerProvinceOrState: input.customerProvinceOrState?.trim() || null,
    businessStatus: input.businessStatus,
    taxRegistrationId: reg,
    currency: (input.currency ?? "CAD").toUpperCase(),
    labelledDemo: true,
    policyVersion: "2026-11-10",
  }
}

/** Deskulpt Inc application-fee identity for Ontario Connect demo builders. */
export function deskulptCanadaAppFeeTaxIdentity(input?: {
  customerProvinceOrState?: string | null
  businessStatus?: BusinessStatus
}): InvoiceTaxIdentity {
  return buildInvoiceTaxIdentity({
    issuingLegalEntity: DESKULPT_CANADA_LEGAL_NAME,
    customerCountry: "CA",
    customerProvinceOrState: input?.customerProvinceOrState ?? "ON",
    businessStatus: input?.businessStatus ?? "business",
    taxRegistrationId: DESKULPT_CANADA_GST_HST_NUMBER,
    currency: "CAD",
  })
}
