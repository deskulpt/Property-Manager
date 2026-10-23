/**
 * Landlord listing plans — annual, per active listed property.
 * Amounts are **proposed** (see docs/brief-pricing-plans-mvp.md). Not live billing.
 */

export type PlanId = "basic" | "growth" | "pro" | "enterprise"

export type PlanFeatureValue = boolean | string

export type PricingPlan = {
  id: PlanId
  name: string
  tagline: string
  /** Proposed INR per active listed property per year (excl. GST unless noted). */
  priceInrPerPropertyYear: number | null
  priceLabel: string
  periodLabel: string
  highlighted?: boolean
  ctaLabel: string
  ctaHref: string
  bullets: string[]
}

export type MatrixRow = {
  feature: string
  basic: PlanFeatureValue
  growth: PlanFeatureValue
  pro: PlanFeatureValue
}

export type AdvantageRow = {
  feature: string
  advantage: string
  benefit: string
}

export type ComparisonColumn = {
  id: string
  name: string
  cells: string[]
}

export const PRICING_META = {
  currency: "INR",
  billPeriodMonths: 12,
  meter: "per active listed property / year",
  proposed: true,
  gstNote: "Amounts are proposed and exclusive of GST (18% may apply when billing goes live).",
  trialNote: "14-day Pro trial (1 property seat) — proposed; then Basic+ to keep a public listing.",
  noBrokerHeadline: "No Broker!",
  noBrokerBody:
    "Applicants verify and apply directly with landlords. Easy Rental never takes brokerage — browse, visit, and apply stay free for occupants.",
} as const

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "basic",
    name: "Basic",
    tagline: "List one warehouse or park bay for a full year.",
    priceInrPerPropertyYear: 499,
    priceLabel: "₹499",
    periodLabel: "per listed property / year",
    ctaLabel: "Start with Basic",
    ctaHref: "/pricing/checkout?plan=basic",
    bullets: [
      "Public listing + OSM map pin",
      "Applications + visit booking",
      "1 Matterport tour · QR poster",
      "2 org seats · 25 units soft cap",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Scale seats as you publish more C&I stock.",
    priceInrPerPropertyYear: 1499,
    priceLabel: "₹1,499",
    periodLabel: "per listed property / year",
    highlighted: true,
    ctaLabel: "Choose Growth",
    ctaHref: "/pricing/checkout?plan=growth",
    bullets: [
      "Buy N seats — one price per live listing",
      "Up to 3 Matterport tours · branded QR",
      "Live Razorpay shop when keys set",
      "Ask Easy stub · email support 48h",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Brand domain, Ask Easy, and priority desk ops.",
    priceInrPerPropertyYear: 2999,
    priceLabel: "₹2,999",
    periodLabel: "per listed property / year",
    ctaLabel: "Go Pro",
    ctaHref: "/pricing/checkout?plan=pro",
    bullets: [
      "Custom domain (1 hostname)",
      "Ask Easy fair-use · priority email",
      "Unlimited fair-use Matterport / property",
      "Partner network priority match",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Volume seats, SSO, and white-label later.",
    priceInrPerPropertyYear: null,
    priceLabel: "Custom",
    periodLabel: "volume + sales-led",
    ctaLabel: "Talk to sales",
    ctaHref: "/pricing/contact?plan=enterprise",
    bullets: [
      "Portfolio volume pricing",
      "SSO / white-label path (later)",
      "Dedicated onboarding",
      "SLA-backed support",
    ],
  },
]

export const FEATURE_MATRIX: MatrixRow[] = [
  {
    feature: "Active listed properties",
    basic: "1 seat / purchase",
    growth: "N seats (per-property)",
    pro: "N seats",
  },
  { feature: "Public listings + OSM map", basic: true, growth: true, pro: true },
  { feature: "Applications + visit booking", basic: true, growth: true, pro: true },
  {
    feature: "Ledger / tickets / reminders",
    basic: "Demo→live path",
    growth: "Demo→live path",
    pro: "Demo→live path",
  },
  {
    feature: "Matterport iframe tour",
    basic: "1 / property",
    growth: "Up to 3 / property",
    pro: "Unlimited fair-use",
  },
  {
    feature: "QR print posters",
    basic: "Standard template",
    growth: "Logo lockup",
    pro: "Multi-unit batch",
  },
  { feature: "Custom domain", basic: false, growth: false, pro: "1 hostname" },
  {
    feature: "Occupant shop + Razorpay",
    basic: "Demo shop only",
    growth: "Live when keys set",
    pro: "Live + more SKU slots",
  },
  { feature: "Ask Easy", basic: false, growth: "Stub / limited", pro: "Yes (fair-use)" },
  {
    feature: "Partner & Service Network",
    basic: "Browse",
    growth: "Request + approve",
    pro: "Priority match + geo",
  },
  { feature: "Org seats", basic: "2", growth: "5", pro: "15" },
  { feature: "Units soft cap / property", basic: "25", growth: "80", pro: "200" },
  { feature: "3D GLB/IFC models / property", basic: "1 (≤25 MB)", growth: "3", pro: "10" },
  { feature: "Media storage / property", basic: "2 GB", growth: "10 GB", pro: "50 GB" },
  { feature: "Support", basic: "Docs", growth: "Email 48h", pro: "Priority email" },
  { feature: "No Broker! direct apply", basic: true, growth: true, pro: true },
]

export const ADVANTAGES: AdvantageRow[] = [
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
    benefit: "Looks like your leasing office, not a classifieds dump",
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

export const COMPARISON_ROWS = [
  "Who pays",
  "Typical cost shape",
  "Brokerage",
  "Validity",
  "Occupant apply",
  "C&I desk tools",
  "Portfolio meter",
] as const

export const COMPARISON: ComparisonColumn[] = [
  {
    id: "brokerage",
    name: "Traditional brokerage",
    cells: [
      "Landlord and/or tenant via agent",
      "~0.5–1 month rent (market practice)",
      "Yes",
      "Per deal",
      "Via broker",
      "Rare",
      "Commission scales with rent",
    ],
  },
  {
    id: "nobrokerish",
    name: "NoBroker-style contact packs",
    cells: [
      "Seeker and/or owner (tier packs)",
      "~₹999 / ₹2,999 / ₹5,499 one-shots (approx.)",
      "Claims zero; paid assistance",
      "Often short windows",
      "Often after paid unlock / RM",
      "Listing + leads focus",
      "Packs ≠ portfolio SaaS",
    ],
  },
  {
    id: "easy",
    name: "Easy Rental (proposed)",
    cells: [
      "Landlord (SaaS)",
      "₹499 / ₹1,499 / ₹2,999 per active listing / year",
      "No Broker!",
      "12 months",
      "Free direct apply",
      "Listings, Matterport, QR, shop, Ask Easy, partners",
      "Pay per property listed",
    ],
  },
]

export function getPlan(id: string | null | undefined): PricingPlan | undefined {
  if (!id) return undefined
  return PRICING_PLANS.find((p) => p.id === id)
}

export function formatMatrixCell(value: PlanFeatureValue): string {
  if (value === true) return "Yes"
  if (value === false) return "—"
  return value
}
