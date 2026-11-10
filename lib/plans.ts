/**
 * Landlord packages — entitlements + public cards (D01/D02).
 * Money meter is per billable unit / month in `lib/billing/pricing.ts`.
 * Packages gate features; they are not a second charging meter.
 */

import {
  FREE_PLAN_MAX_UNITS,
  SALE_MONTHLY_PAISE,
  STANDARD_MONTHLY_PAISE,
  formatInrPaise,
} from "@/lib/billing/pricing"

export type PlanId = "starter" | "growth" | "pro" | "enterprise"

/** @deprecated Prefer PlanId — alias kept for existing PackageTier call sites. */
export type PackageTier = PlanId

/** Split AI / automation / API entitlements (D02). */
export type PlanEntitlements = {
  "assistant.read": boolean
  "assistant.draft": boolean
  "assistant.propose": boolean
  "automation.policies": boolean
  "mcp.access": boolean
  "api.access": boolean
}

export type PlanLimits = {
  id: PlanId
  label: string
  /** Soft cap on active listed (published) properties. */
  maxProperties: number
  maxUnitsPerProperty: number
  maxSeats: number
  /**
   * @deprecated D15 NOT Aloke-approved — Matterport/360 is paid add-on or BYO, not base.
   * Kept for display migration; prefer `matterportIncluded: false` + add-on SKU.
   */
  matterportTours: number | "unlimited"
  /** D15 CFO: Matterport not in base plans until Aloke approves. */
  matterportIncluded: false
  /** Soft media storage cap (MB) — D15. */
  mediaStorageCapMb: number
  customDomain: boolean
  /**
   * Legacy Ask Easy desk/draft gate — true when draft or propose entitled.
   * Prefer `entitlements` for new checks.
   */
  askEasy: boolean
  liveRazorpay: boolean
  entitlements: PlanEntitlements
}

export type PublicPlanCard = {
  id: PlanId
  label: string
  /** Illustrative monthly INR for card display; null = free / custom / sales. */
  priceInr: number | null
  priceLabel: string
  /** Meter copy under the price (never per-property/year after D01). */
  meterLabel: string
  blurb: string
  highlights: string[]
  cta: string
  href: string
  featured?: boolean
  /** True while live MoR charge is not active (demo activate only). */
  proposed: boolean
}

export const DEFAULT_PLAN: PlanId = "starter"

const ENTITLE_NONE: PlanEntitlements = {
  "assistant.read": false,
  "assistant.draft": false,
  "assistant.propose": false,
  "automation.policies": false,
  "mcp.access": false,
  "api.access": false,
}

const ENTITLE_GROWTH: PlanEntitlements = {
  ...ENTITLE_NONE,
  "assistant.read": true,
}

const ENTITLE_PRO: PlanEntitlements = {
  ...ENTITLE_GROWTH,
  "assistant.draft": true,
  "assistant.propose": true,
}

const ENTITLE_ENTERPRISE: PlanEntitlements = {
  ...ENTITLE_PRO,
  "automation.policies": true,
  "mcp.access": true,
  "api.access": true,
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  starter: {
    id: "starter",
    label: "Free",
    maxProperties: 50,
    maxUnitsPerProperty: 1,
    maxSeats: 2,
    matterportTours: 0,
    matterportIncluded: false,
    mediaStorageCapMb: 256,
    customDomain: false,
    askEasy: false,
    liveRazorpay: false,
    entitlements: ENTITLE_NONE,
  },
  growth: {
    id: "growth",
    label: "Growth",
    maxProperties: 10,
    maxUnitsPerProperty: 80,
    maxSeats: 5,
    matterportTours: 0,
    matterportIncluded: false,
    mediaStorageCapMb: 2_048,
    customDomain: false,
    askEasy: false,
    liveRazorpay: true,
    entitlements: ENTITLE_GROWTH,
  },
  pro: {
    id: "pro",
    label: "Pro",
    maxProperties: 50,
    maxUnitsPerProperty: 200,
    maxSeats: 15,
    matterportTours: 0,
    matterportIncluded: false,
    mediaStorageCapMb: 10_240,
    customDomain: true,
    askEasy: true,
    liveRazorpay: true,
    entitlements: ENTITLE_PRO,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    maxProperties: 10_000,
    maxUnitsPerProperty: 10_000,
    maxSeats: 500,
    matterportTours: 0,
    matterportIncluded: false,
    mediaStorageCapMb: 102_400,
    customDomain: true,
    askEasy: true,
    liveRazorpay: true,
    entitlements: ENTITLE_ENTERPRISE,
  },
}

const homesFromInr = Math.round(SALE_MONTHLY_PAISE.homes / 100)
const homesStdInr = Math.round(STANDARD_MONTHLY_PAISE.homes / 100)

/** Public pricing cards — package entitlements; money = per-unit catalogue (D01). */
export const PUBLIC_PLANS: PublicPlanCard[] = [
  {
    id: "starter",
    label: "Free",
    priceInr: 0,
    priceLabel: "₹0",
    meterLabel: `${FREE_PLAN_MAX_UNITS} billable unit · no AI entitlements`,
    blurb: "Try the desk on one unit. Seekers browse and apply free — No Broker!",
    highlights: [
      `${FREE_PLAN_MAX_UNITS} billable unit (Homes / Retail & Office / Industrial meter)`,
      "Public listings + OSM map",
      "Applications + visit booking",
      "Matterport/360 = paid add-on or BYO (not base — D15 pending)",
      `Media storage cap ${PLAN_LIMITS.starter.mediaStorageCapMb} MB`,
      "Standard QR print posters",
      "Demo shop only · no Ask Easy",
    ],
    cta: "Start free",
    href: "/pricing/subscribe?plan=starter",
    proposed: true,
  },
  {
    id: "growth",
    label: "Growth",
    priceInr: homesFromInr,
    priceLabel: formatInrPaise(SALE_MONTHLY_PAISE.homes),
    meterLabel: `from / unit / month · excl. GST · sale Homes (std ${formatInrPaise(STANDARD_MONTHLY_PAISE.homes)})`,
    blurb: "Paid unit metre + assistant.read. Live Razorpay shop when keys are set.",
    highlights: [
      "Pay per billable unit (Homes / Retail & Office / Industrial)",
      "assistant.read entitlement",
      "Matterport/360 add-on or BYO (not included)",
      "QR + logo lockup",
      "Live Razorpay when keys set",
      "Partner request + landlord approve",
    ],
    cta: "Choose Growth",
    href: "/pricing/subscribe?plan=growth",
    featured: true,
    proposed: true,
  },
  {
    id: "pro",
    label: "Pro",
    priceInr: homesFromInr,
    priceLabel: formatInrPaise(SALE_MONTHLY_PAISE.homes),
    meterLabel: "from / unit / month · excl. GST · + Ask Easy draft/propose",
    blurb: "Custom domain and Ask Easy draft/propose with human approval.",
    highlights: [
      "Same per-unit metre as Growth",
      "assistant.draft + assistant.propose",
      "Matterport/360 add-on or BYO (not included)",
      "Custom domain (1 hostname)",
      "Multi-unit QR batch",
      "Priority email support",
    ],
    cta: "Go Pro",
    href: "/pricing/subscribe?plan=pro",
    proposed: true,
  },
  {
    id: "enterprise",
    label: "Enterprise",
    priceInr: null,
    priceLabel: "Custom",
    meterLabel: ">50 units = sales quote · MCP / API / automation policies",
    blurb: "Volume portfolios, SSO / white-label later — sales-led. Self-serve volume stops at 50 units.",
    highlights: [
      "Enterprise quote (not self-serve 0% volume)",
      "automation.policies + mcp.access + api.access",
      "Dedicated onboarding",
      "SLA + priority support",
      "White-label options (roadmap)",
    ],
    cta: "Talk to sales",
    href: "mailto:hello@easyrental.space?subject=Easy%20Rental%20Enterprise",
    proposed: true,
  },
]

export type FeatureMatrixRow = {
  feature: string
  starter: string
  growth: string
  pro: string
}

export const FEATURE_MATRIX: FeatureMatrixRow[] = [
  {
    feature: "Billable units",
    starter: `${FREE_PLAN_MAX_UNITS} unit`,
    growth: "Per-unit metre",
    pro: "Per-unit metre",
  },
  {
    feature: "Public listings + OSM map",
    starter: "Yes",
    growth: "Yes",
    pro: "Yes",
  },
  {
    feature: "Applications + visit booking",
    starter: "Yes",
    growth: "Yes",
    pro: "Yes",
  },
  {
    feature: "Matterport / 360",
    starter: "Add-on or BYO (not base)",
    growth: "Add-on or BYO (not base)",
    pro: "Add-on or BYO (not base)",
  },
  {
    feature: "QR print posters",
    starter: "Standard",
    growth: "Yes + logo lockup",
    pro: "Yes + multi-unit batch",
  },
  {
    feature: "Custom domain",
    starter: "Upgrade CTA",
    growth: "Upgrade CTA",
    pro: "Yes (1 hostname)",
  },
  {
    feature: "Occupant shop + Razorpay",
    starter: "Demo shop only",
    growth: "Live when keys set",
    pro: "Live + more SKU slots",
  },
  {
    feature: "assistant.read",
    starter: "—",
    growth: "Yes",
    pro: "Yes",
  },
  {
    feature: "assistant.draft / propose",
    starter: "—",
    growth: "Upgrade to Pro",
    pro: "Yes (human approve)",
  },
  {
    feature: "Partner & Service Network",
    starter: "Browse partners",
    growth: "Request + approve",
    pro: "Priority match + geo",
  },
  {
    feature: "Org seats (landlord users)",
    starter: "2",
    growth: "5",
    pro: "15",
  },
  {
    feature: "Units soft cap / property",
    starter: "1",
    growth: "80",
    pro: "200",
  },
  {
    feature: "Media storage / property",
    starter: "2 GB",
    growth: "10 GB",
    pro: "50 GB",
  },
  {
    feature: "Support",
    starter: "Docs",
    growth: "Email 48h",
    pro: "Priority email",
  },
  {
    feature: "No Broker! direct apply",
    starter: "Required",
    growth: "Required",
    pro: "Required",
  },
]

export type FabRow = { feature: string; advantage: string; benefit: string }

export const FAB_ROWS: FabRow[] = [
  {
    feature: "Per-unit monthly metre",
    advantage: "Pay for Homes / Retail & Office / Industrial stock you operate",
    benefit: "No per-property-year double meter; free seekers stay free",
  },
  {
    feature: "Direct apply (no contact paywall)",
    advantage: "More serious applicants",
    benefit: "Faster lease-up without brokerage",
  },
  {
    feature: "Matterport + QR posters",
    advantage: "Tours on-site and online",
    benefit: "Fewer wasted visits",
  },
  {
    feature: "Custom domain (Pro)",
    advantage: "Brand URL for parks",
    benefit: "Looks like your leasing office",
  },
  {
    feature: "Shop + Razorpay",
    advantage: "Monetise keys / filters / lift slots",
    benefit: "Ops revenue without a separate storefront",
  },
  {
    feature: "Ask Easy (Pro)",
    advantage: "Draft + propose with human approve",
    benefit: "Less time writing C&I copy — never-auto intact",
  },
  {
    feature: "Partner network",
    advantage: "Vetted trades nearby",
    benefit: "One desk for lease + service providers",
  },
]

export type CompareRow = {
  dimension: string
  brokerage: string
  contactPacks: string
  easyRental: string
}

export const COMPARE_ROWS: CompareRow[] = [
  {
    dimension: "Who pays",
    brokerage: "Usually landlord and/or tenant via agent",
    contactPacks: "Seeker and/or owner (tier packs)",
    easyRental: "Landlord (SaaS per billable unit)",
  },
  {
    dimension: "Typical cost shape",
    brokerage: "~0.5–1 month rent (market practice)",
    contactPacks: "~₹999 / ₹2,999 / ₹5,499 one-shots (approx.)",
    easyRental: `Homes from ${formatInrPaise(SALE_MONTHLY_PAISE.homes)}/unit/mo sale (std ${formatInrPaise(STANDARD_MONTHLY_PAISE.homes)}); +18% GST India`,
  },
  {
    dimension: "Brokerage",
    brokerage: "Yes",
    contactPacks: "Claims zero; paid assistance",
    easyRental: "No Broker!",
  },
  {
    dimension: "Validity",
    brokerage: "Per deal",
    contactPacks: "Often short windows",
    easyRental: "Monthly or annual (10×) · 12-month price lock on paid join",
  },
  {
    dimension: "Occupant apply",
    brokerage: "Via broker",
    contactPacks: "Often after paid unlock",
    easyRental: "Free direct apply",
  },
  {
    dimension: "Portfolio meter",
    brokerage: "Commission scales with rent",
    contactPacks: "Packs ≠ portfolio SaaS",
    easyRental: "Pay per billable unit / month (not per-property/year)",
  },
]

export function parsePlanId(value: string | null | undefined): PlanId {
  if (value === "growth" || value === "pro" || value === "enterprise" || value === "starter") {
    return value
  }
  if (value === "basic") return "starter"
  if (value === "portfolio") return "pro"
  return DEFAULT_PLAN
}

export function planLimits(id: PlanId): PlanLimits {
  return PLAN_LIMITS[id]
}

export function planEntitlements(id: PlanId): PlanEntitlements {
  return PLAN_LIMITS[id].entitlements
}

export function planHasEntitlement(id: PlanId, key: keyof PlanEntitlements): boolean {
  return PLAN_LIMITS[id].entitlements[key]
}

export function planLabel(id: PlanId): string {
  return PLAN_LIMITS[id].label
}

export function packageHasCustomDomain(id: PlanId): boolean {
  return PLAN_LIMITS[id].customDomain
}

/** True when package may use Ask Easy draft/propose desk (Pro+). */
export function packageHasAskEasy(id: PlanId): boolean {
  return PLAN_LIMITS[id].askEasy
}

/** Paid self-serve SKUs (not Enterprise). */
export function isSelfServePlan(id: PlanId): boolean {
  return id === "starter" || id === "growth" || id === "pro"
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Subscribe route used by L2 landlord onboard + public pricing CTAs. */
export const SUBSCRIBE_PATH = "/pricing/subscribe"

export function subscribeHref(plan: PlanId, extras?: { seats?: number; from?: string }) {
  const params = new URLSearchParams()
  params.set("plan", plan)
  if (extras?.seats && extras.seats > 1) params.set("seats", String(extras.seats))
  if (extras?.from) params.set("from", extras.from)
  return `${SUBSCRIBE_PATH}?${params.toString()}`
}

/** Illustrative Homes sale/standard INR for tests and copy (D01). */
export const PUBLIC_HOMES_SALE_INR = homesFromInr
export const PUBLIC_HOMES_STANDARD_INR = homesStdInr
