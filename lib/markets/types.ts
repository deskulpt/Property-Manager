import { z } from "zod"

/** Country business schema pack — one UI, pack-swapped money/tax/payments/eSign/SMS. */
export const CountryPackSchema = z.object({
  iso: z.string().length(2),
  name: z.string().min(2),
  locale: z.string().min(2),
  currency: z.string().min(3).max(3),
  minorExponent: z.number().int().min(0).max(4),
  gstBps: z.number().int().min(0),
  taxLabels: z.array(z.string()).min(1),
  phoneCc: z.string().min(2),
  postalRule: z.string().min(2),
  postalLabel: z.string().min(2),
  addressFieldOrder: z.array(z.string()).min(1),
  idDocuments: z.array(
    z.object({
      country: z.string(),
      docType: z.enum(["kyc_provider", "driving_licence"]),
      label: z.string(),
    }),
  ),
  paymentMethods: z.array(
    z.object({
      kind: z.enum(["upi", "enach", "card_demo", "interac", "stripe_card"]),
      label: z.string(),
      hint: z.string(),
    }),
  ),
  platformMoR: z.object({
    domestic: z.enum(["dodo", "stripe", "demo", "paypal"]),
    intl: z.enum(["dodo", "stripe", "demo", "paypal"]).optional(),
  }),
  esignProviders: z.array(z.enum(["demo", "digio", "emudhra", "docusign"])),
  smsProvider: z.enum(["demo", "msg91", "twilio"]),
  rentBasisDefault: z.enum(["per_sqft_month", "per_sqft_year", "total_month"]),
  areaDisplayUnit: z.enum(["sqft", "sqm"]),
  rateUnitLabel: z.string(),
  statesLabel: z.string(),
  citiesHint: z.string(),
  displayCurrencies: z.array(z.enum(["INR", "USD", "CAD", "GBP"])),
  jurisdictionPresetRef: z.string().optional(),
  legalCopyKeys: z.array(z.string()).default([]),
})

export type CountryPack = z.infer<typeof CountryPackSchema>

export type CountryPackStatus = "draft" | "ready" | "live"

export type CountryPackRow = {
  iso: string
  name: string
  status: CountryPackStatus
  pack: CountryPack
  draftId: string | null
  updatedAt: string
}
