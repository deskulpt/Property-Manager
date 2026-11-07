/**
 * L0 compliance console catalog — sign-off checklist + money/hard-lock metadata.
 * Does not own flag storage; CountryPack LEGAL keys + host-rail pay-planes do.
 */

import type { LegalFeatureFlagKey } from "@/lib/markets/legal-flags"

export type ComplianceSignOffRole = "LEGAL" | "FINANCE" | "TECH" | "ALOKE"

export type ComplianceSignOff = {
  role: ComplianceSignOffRole
  needed: string
}

/** Reserved host-rail payment planes (ER-48) — hostname labels, not camelCase. */
export const PAY_PLANE_FLAG_IDS = ["in-pay", "ca-pay"] as const
export type PayPlaneFlagId = (typeof PAY_PLANE_FLAG_IDS)[number]

export const PAY_PLANE_ENV_KEYS: Record<PayPlaneFlagId, string> = {
  "in-pay": "EASYRENTAL_FLAG_IN_PAY",
  "ca-pay": "EASYRENTAL_FLAG_CA_PAY",
}

export const PAY_PLANE_HOSTS: Record<PayPlaneFlagId, string> = {
  "in-pay": "in-pay.easyrental.space",
  "ca-pay": "ca-pay.easyrental.space",
}

export const PAY_PLANE_COUNTRY: Record<PayPlaneFlagId, "IN" | "CA"> = {
  "in-pay": "IN",
  "ca-pay": "CA",
}

export const PAY_PLANE_META_PREFIX = "compliance.pay_plane."

export function payPlaneMetaKey(id: PayPlaneFlagId): string {
  return `${PAY_PLANE_META_PREFIX}${id}`
}

export function isPayPlaneFlagId(key: string): key is PayPlaneFlagId {
  return (PAY_PLANE_FLAG_IDS as readonly string[]).includes(key)
}

/** Hard product locks (not LEGAL_FEATURE_FLAGS toggles). */
export type ComplianceHardLockKey =
  | "caTenantCardFee"
  | "ontarioDamageDeposit"
  | "ontarioMlsImport"
  | "ontarioCommercialSales"
  | "ontarioAutomatedEviction"

export type ComplianceCatalogEntry = {
  key: LegalFeatureFlagKey | PayPlaneFlagId | ComplianceHardLockKey
  label: string
  blurb: string
  countries: ReadonlyArray<"IN" | "CA">
  money: boolean
  hardLocked: boolean
  payPlane?: boolean
  signOffs: ReadonlyArray<ComplianceSignOff>
}

/** Money / regulated LEGAL keys — enabling requires distinct peer (no self-approval). */
export const MONEY_LEGAL_FLAG_KEYS = [
  "ontarioConnectDirectPad",
  "caStripeTaxHst",
  "inTaxMatrix",
  "razorpayIndianEntity",
  "routeHolds",
  "depositHolds",
  "mandatoryTenantSurcharge",
  "eStore",
  "concierge",
  "affiliate",
] as const satisfies ReadonlyArray<LegalFeatureFlagKey>

export function isMoneyLegalFlag(key: LegalFeatureFlagKey): boolean {
  return (MONEY_LEGAL_FLAG_KEYS as readonly string[]).includes(key)
}

/**
 * India money / pay-plane surface is **parked** — Canada focus.
 * IN money toggles stay OFF; console labels India parked; enables rejected.
 */
export const INDIA_COMPLIANCE_PARKED = true

export const INDIA_MONEY_FLAG_KEYS = [
  "razorpayIndianEntity",
  "inTaxMatrix",
  "routeHolds",
  "depositHolds",
  "mandatoryTenantSurcharge",
  "eStore",
  "concierge",
  "affiliate",
  "in-pay",
] as const

export function isIndiaMoneyFlag(key: string): boolean {
  return (INDIA_MONEY_FLAG_KEYS as readonly string[]).includes(key)
}

export function isIndiaMoneyParked(iso: string, key: string): boolean {
  return INDIA_COMPLIANCE_PARKED && iso.toUpperCase() === "IN" && isIndiaMoneyFlag(key)
}

export const COMPLIANCE_CATALOG: ReadonlyArray<ComplianceCatalogEntry> = [
  {
    key: "razorpayIndianEntity",
    label: "Payments · Razorpay (IN entity)",
    blurb: "Indian-entity Razorpay merchant rail.",
    countries: ["IN"],
    money: true,
    hardLocked: false,
    signOffs: [
      { role: "LEGAL", needed: "Razorpay written in-principle + IN counsel" },
      { role: "FINANCE", needed: "IN entity merchant account live" },
      { role: "ALOKE", needed: "Enable after entity exists" },
    ],
  },
  {
    key: "in-pay",
    label: "Payment plane · in-pay",
    blurb: "Host rail in-pay.easyrental.space. Env EASYRENTAL_FLAG_IN_PAY. DNS only after ON.",
    countries: ["IN"],
    money: true,
    hardLocked: false,
    payPlane: true,
    signOffs: [
      { role: "LEGAL", needed: "IN data-residency + payment-plane review" },
      { role: "FINANCE", needed: "Plane settlement isolation" },
      { role: "TECH", needed: "DNS/hosting after flag ON (ER-48)" },
      { role: "ALOKE", needed: "Enable reserved plane" },
    ],
  },
  {
    key: "ontarioConnectDirectPad",
    label: "Payments · Stripe Connect DIRECT + PAD",
    blurb: "Ontario landlord Connect DIRECT + PAD; Deskulpt app fee only.",
    countries: ["CA"],
    money: true,
    hardLocked: false,
    signOffs: [
      { role: "LEGAL", needed: "ON tenant-fee / provider-reg + funds-flow" },
      { role: "FINANCE", needed: "Stripe acceptance + HST remit" },
      { role: "ALOKE", needed: "Enable after Legal/Finance" },
    ],
  },
  {
    key: "ca-pay",
    label: "Payment plane · ca-pay",
    blurb: "Host rail ca-pay.easyrental.space. Env EASYRENTAL_FLAG_CA_PAY. DNS only after ON.",
    countries: ["CA"],
    money: true,
    hardLocked: false,
    payPlane: true,
    signOffs: [
      { role: "LEGAL", needed: "CA/EU ledger + Connect plane review" },
      { role: "FINANCE", needed: "Plane settlement isolation" },
      { role: "TECH", needed: "DNS/hosting after flag ON (ER-48)" },
      { role: "ALOKE", needed: "Enable reserved plane" },
    ],
  },
  {
    key: "caStripeTaxHst",
    label: "Tax · Stripe Tax / HST (CA)",
    blurb: "Live CA tax adapter.",
    countries: ["CA"],
    money: true,
    hardLocked: false,
    signOffs: [
      { role: "FINANCE", needed: "Stripe Tax account + remittance" },
      { role: "LEGAL", needed: "Tax specialist review" },
    ],
  },
  {
    key: "inTaxMatrix",
    label: "Tax · GST matrix (IN)",
    blurb: "Live IN GST matrix adapter.",
    countries: ["IN"],
    money: true,
    hardLocked: false,
    signOffs: [
      { role: "FINANCE", needed: "GSTIN / RC path" },
      { role: "LEGAL", needed: "IN tax specialist" },
    ],
  },
  {
    key: "routeHolds",
    label: "Route / rent splits",
    blurb: "Razorpay Route / splits — OFF until written acceptance.",
    countries: ["IN"],
    money: true,
    hardLocked: false,
    signOffs: [
      { role: "LEGAL", needed: "Written Razorpay Route acceptance" },
      { role: "FINANCE", needed: "CFO confirms no Route as primary" },
    ],
  },
  {
    key: "depositHolds",
    label: "Deposit holds",
    blurb: "Platform holding deposits — OFF until licensed escrow.",
    countries: ["IN", "CA"],
    money: true,
    hardLocked: false,
    signOffs: [
      { role: "LEGAL", needed: "Licensed escrow definition" },
      { role: "FINANCE", needed: "CFO reject unless escrow licensed" },
    ],
  },
  {
    key: "mandatoryTenantSurcharge",
    label: "Mandatory tenant surcharge",
    blurb: "Forced tenant-paid fee.",
    countries: ["IN", "CA"],
    money: true,
    hardLocked: false,
    signOffs: [
      { role: "LEGAL", needed: "Jurisdiction safe-harbour opinion" },
      { role: "FINANCE", needed: "Disclosure % + mandate terms" },
    ],
  },
  {
    key: "caTenantCardFee",
    label: "CA tenant card fee",
    blurb: "Disabled by product policy; Ontario residential legal risk. Hard-locked OFF — counsel + code release to change (not a toggle).",
    countries: ["CA"],
    money: true,
    hardLocked: true,
    signOffs: [
      {
        role: "LEGAL",
        needed: "Permanent OFF (RTA s134 / product policy) — counsel + code release",
      },
    ],
  },
  {
    key: "ontarioDamageDeposit",
    label: "Ontario damage / security deposit",
    blurb: "Hard-locked OFF — RTA residential: last month's rent only (≤ 1 month) + refundable key deposits at cost.",
    countries: ["CA"],
    money: true,
    hardLocked: true,
    signOffs: [{ role: "LEGAL", needed: "Permanent OFF — RTA deposit rules" }],
  },
  {
    key: "ontarioMlsImport",
    label: "MLS / PropTx / REALTOR.ca import",
    blurb: "Hard-locked OFF — Ontario listings are landlord-direct only.",
    countries: ["CA"],
    money: false,
    hardLocked: true,
    signOffs: [{ role: "LEGAL", needed: "Permanent OFF until listing-rights counsel" }],
  },
  {
    key: "ontarioCommercialSales",
    label: "Commercial leases / sales flows",
    blurb: "Hard-locked OFF — RTA residential only (TRESA s5(1)(j) exemption).",
    countries: ["CA"],
    money: false,
    hardLocked: true,
    signOffs: [{ role: "LEGAL", needed: "Permanent OFF for Ontario demo/staging scope" }],
  },
  {
    key: "ontarioAutomatedEviction",
    label: "Automated eviction",
    blurb: "Hard-locked OFF — official LTB N-forms + human review only.",
    countries: ["CA"],
    money: false,
    hardLocked: true,
    signOffs: [{ role: "LEGAL", needed: "Permanent OFF — no automated eviction" }],
  },
  {
    key: "eStore",
    label: "E-store live",
    blurb: "Occupant shop live charges beyond demo.",
    countries: ["IN", "CA"],
    money: true,
    hardLocked: false,
    signOffs: [
      { role: "LEGAL", needed: "Consumer / payment terms" },
      { role: "FINANCE", needed: "Settlement + tax on SKUs" },
    ],
  },
  {
    key: "concierge",
    label: "Concierge live",
    blurb: "Paid concierge / service network.",
    countries: ["IN", "CA"],
    money: true,
    hardLocked: false,
    signOffs: [
      { role: "LEGAL", needed: "Provider contract + liability" },
      { role: "FINANCE", needed: "Fee schedule + payout dual-control" },
    ],
  },
  {
    key: "affiliate",
    label: "Affiliate live",
    blurb: "Affiliate / partner payouts (id `affiliate`, not affiliateLive).",
    countries: ["IN", "CA"],
    money: true,
    hardLocked: false,
    signOffs: [
      { role: "LEGAL", needed: "Affiliate terms" },
      { role: "FINANCE", needed: "Payout rails + audit" },
    ],
  },
  {
    key: "onStandardLeaseLive",
    label: "Ontario standard lease live",
    blurb: "Production ON Standard Lease templates.",
    countries: ["CA"],
    money: false,
    hardLocked: false,
    signOffs: [{ role: "LEGAL", needed: "ON counsel on lease + disclaimer" }],
  },
  {
    key: "tgProductionLease",
    label: "Telangana production lease",
    blurb: "TG stamp/registration production path.",
    countries: ["IN"],
    money: false,
    hardLocked: false,
    signOffs: [{ role: "LEGAL", needed: "TG stamp/registration counsel" }],
  },
  {
    key: "realPiiAiConnectorsMedia",
    label: "Live AI / real PII",
    blurb: "Real PII through AI connectors/media.",
    countries: ["IN", "CA"],
    money: false,
    hardLocked: false,
    signOffs: [
      { role: "LEGAL", needed: "Privacy/security data-handling + DPA" },
      { role: "TECH", needed: "PII redaction + neuron limits verified" },
    ],
  },
]

export function catalogEntryFor(
  key: string,
): ComplianceCatalogEntry | undefined {
  return COMPLIANCE_CATALOG.find((e) => e.key === key)
}

/** Unchecked go-live blockers for Ontario demo/staging console (never mark done here). */
export const ONTARIO_GO_LIVE_BLOCKERS = [
  { id: "on_lawyer_review", label: "Ontario lawyer written review", done: false as const },
  {
    id: "stripe_money_flow_rpaa",
    label: "Stripe money-flow doc plus RPAA/FINTRAC determination",
    done: false as const,
  },
  { id: "listing_rights", label: "Listing rights", done: false as const },
  {
    id: "rta_privacy_demo",
    label: "RTA and privacy controls demonstrated",
    done: false as const,
  },
] as const
