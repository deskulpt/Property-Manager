/**
 * Landlord listing plans — PRD §7 / brief-pricing-plans-mvp.
 * Public ladder: Basic → Growth → Pro (+ Enterprise sales).
 * Code id `starter` is the Basic successor (Slice A / Ask Easy gate compatible).
 */

export type PlanId = "starter" | "growth" | "pro" | "enterprise"

/** @deprecated Prefer PlanId — alias kept for existing PackageTier call sites. */
export type PackageTier = PlanId

export type PlanLimits = {
  id: PlanId
  label: string
  /** Soft cap on active listed (published) properties. */
  maxProperties: number
  maxUnitsPerProperty: number
  maxSeats: number
  matterportTours: number | "unlimited"
  customDomain: boolean
  askEasy: boolean
  liveRazorpay: boolean
}

export type PublicPlanCard = {
  id: PlanId
  label: string
  /** Annual INR per active listed property; null = custom / sales. */
  priceInr: number | null
  priceLabel: string
  blurb: string
  highlights: string[]
  cta: string
  href: string
  featured?: boolean
  proposed: boolean
}

export const DEFAULT_PLAN: PlanId = "starter"

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  starter: {
    id: "starter",
    label: "Free",
    maxProperties: 50,
    maxUnitsPerProperty: 1,
    maxSeats: 2,
    matterportTours: 1,
    customDomain: false,
    askEasy: false,
    liveRazorpay: false,
  },
  growth: {
    id: "growth",
    label: "Growth",
    maxProperties: 10,
    maxUnitsPerProperty: 80,
    maxSeats: 5,
    matterportTours: 3,
    customDomain: false,
    askEasy: false,
    liveRazorpay: true,
  },
  pro: {
    id: "pro",
    label: "Pro",
    maxProperties: 50,
    maxUnitsPerProperty: 200,
    maxSeats: 15,
    matterportTours: "unlimited",
    customDomain: true,
    askEasy: true,
    liveRazorpay: true,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    maxProperties: 10_000,
    maxUnitsPerProperty: 10_000,
    maxSeats: 500,
    matterportTours: "unlimited",
    customDomain: true,
    askEasy: true,
    liveRazorpay: true,
  },
}

/** Public pricing cards (excl. GST; amounts proposed until commercial sign-off). */
export const PUBLIC_PLANS: PublicPlanCard[] = [
  {
    id: "starter",
    label: "Basic",
    priceInr: 499,
    priceLabel: "₹499",
    blurb: "One active listing seat — publish, tours, QR, and direct apply.",
    highlights: [
      "1 active listed property seat",
      "Public listings + OSM map",
      "Applications + visit booking",
      "1 Matterport tour / property",
      "Standard QR print posters",
      "Demo shop only",
    ],
    cta: "Start with Basic",
    href: "/pricing/subscribe?plan=starter",
    proposed: true,
  },
  {
    id: "growth",
    label: "Growth",
    priceInr: 1499,
    priceLabel: "₹1,499",
    blurb: "Scale seats as you publish — live Razorpay shop when keys are set.",
    highlights: [
      "N seats × per-property price",
      "Up to 3 Matterport tours / property",
      "QR + logo lockup",
      "Live Razorpay when keys set",
      "Ask Easy stub / limited",
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
    priceInr: 2999,
    priceLabel: "₹2,999",
    blurb: "Custom domain, Ask Easy, and priority partner match.",
    highlights: [
      "N seats × per-property price",
      "Unlimited fair-use Matterport",
      "Custom domain (1 hostname)",
      "Ask Easy (fair-use)",
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
    blurb: "Volume seats, SSO / white-label later — sales-led.",
    highlights: [
      "Flexible volume pricing",
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
    feature: "Active listed properties",
    starter: "1 seat / purchase",
    growth: "N seats (per-property)",
    pro: "N seats",
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
    feature: "Matterport iframe tour",
    starter: "1 / property",
    growth: "Up to 3 / property",
    pro: "Unlimited fair-use",
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
    feature: "Ask Easy",
    starter: "Upgrade CTA",
    growth: "Stub / limited",
    pro: "Yes (fair-use)",
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
    starter: "25",
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
    feature: "Per-property annual price",
    advantage: "Pay only for what is live",
    benefit: "No unlimited-portfolio tax on empty shells",
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
    advantage: "Listing autofill + assist",
    benefit: "Less time writing C&I copy",
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
    easyRental: "Landlord (SaaS)",
  },
  {
    dimension: "Typical cost shape",
    brokerage: "~0.5–1 month rent (market practice)",
    contactPacks: "~₹999 / ₹2,999 / ₹5,499 one-shots (approx.)",
    easyRental: "₹499 / ₹1,499 / ₹2,999 per active listing / year",
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
    easyRental: "12 months",
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
    easyRental: "Pay per property listed",
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

export function planLabel(id: PlanId): string {
  return PLAN_LIMITS[id].label
}

export function packageHasCustomDomain(id: PlanId): boolean {
  return PLAN_LIMITS[id].customDomain
}

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
