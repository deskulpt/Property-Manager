/** Refer & Earn (§19A) — Indica Aí–inspired C&I property sourcing. DEMO ledger only. */

export const REF_COOKIE = "er_ref"
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 90

/** ₹2,000 publish reward in paise (proposed). */
export const PUBLISH_REWARD_PAISE = 200_000
/** 5% of first-month rent in basis points (proposed). */
export const LEASE_REWARD_BPS = 500
/** Days from indication / first-touch to reach Published. */
export const ATTRIBUTION_DAYS = 90

export type IndicationStatus =
  | "new"
  | "prospecting"
  | "awaiting_media"
  | "published"
  | "in_negotiation"
  | "leased"
  | "discarded"
  | "deactivated"

export type IndicationPath = "submit" | "link"
export type RewardKind = "publish" | "lease"
export type RewardLedgerStatus = "accrued" | "payable" | "paid_demo"

export type PropertyType =
  | "warehouse"
  | "office"
  | "industrial_park"
  | "retail"
  | "other"

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "warehouse", label: "Warehouse / logistics" },
  { value: "office", label: "Office" },
  { value: "industrial_park", label: "Industrial park" },
  { value: "retail", label: "Retail / showroom" },
  { value: "other", label: "Other C&I" },
]

export const INDICATION_PIPELINE: {
  status: IndicationStatus
  label: string
  terminal?: boolean
}[] = [
  { status: "new", label: "New" },
  { status: "prospecting", label: "Prospecting" },
  { status: "awaiting_media", label: "Awaiting media" },
  { status: "published", label: "Published" },
  { status: "in_negotiation", label: "In negotiation" },
  { status: "leased", label: "Leased" },
]

export const INDICATION_SIDE_STATUSES: {
  status: IndicationStatus
  label: string
}[] = [
  { status: "discarded", label: "Discarded" },
  { status: "deactivated", label: "Deactivated" },
]

const HAPPY_PATH: IndicationStatus[] = [
  "new",
  "prospecting",
  "awaiting_media",
  "published",
  "in_negotiation",
  "leased",
]

export function indicationStatusLabel(status: string): string {
  const hit =
    INDICATION_PIPELINE.find((s) => s.status === status) ??
    INDICATION_SIDE_STATUSES.find((s) => s.status === status)
  return hit?.label ?? status
}

export function nextIndicationStatus(status: IndicationStatus): IndicationStatus | null {
  const i = HAPPY_PATH.indexOf(status)
  if (i < 0 || i >= HAPPY_PATH.length - 1) return null
  return HAPPY_PATH[i + 1]!
}

export function canDiscard(status: IndicationStatus): boolean {
  return status !== "leased" && status !== "discarded" && status !== "deactivated"
}

export function canDeactivate(status: IndicationStatus): boolean {
  return status !== "leased" && status !== "discarded" && status !== "deactivated"
}

/** 15th of the month after event month (ISO date YYYY-MM-DD). */
export function payableOnAfter(eventIso: string): string {
  const d = new Date(eventIso)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + 1 // next month (0-based → +1 then +1 for next)
  const next = new Date(Date.UTC(y, m, 15))
  return next.toISOString().slice(0, 10)
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

export function leaseRewardPaise(firstMonthRentInr: number): number {
  if (!Number.isFinite(firstMonthRentInr) || firstMonthRentInr <= 0) return 0
  const rentPaise = Math.round(firstMonthRentInr * 100)
  return Math.round((rentPaise * LEASE_REWARD_BPS) / 10_000)
}

export function normalizeRefCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24)
}

export function isValidRefCode(raw: string): boolean {
  const code = normalizeRefCode(raw)
  return code.length >= 3 && code.length <= 24
}

export function shareSignupPath(code: string) {
  return `/signup?ref=${encodeURIComponent(normalizeRefCode(code))}`
}

export function shareLandingPath(code: string) {
  return `/r/${encodeURIComponent(normalizeRefCode(code))}`
}

export function whatsappShareUrl(absoluteUrl: string, message?: string) {
  const text =
    message ??
    `Refer industrial properties on Easy Rental and earn proposed rewards. ${absoluteUrl}`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 4) return "••••"
  return `+${digits.slice(0, 2)} ••••••${digits.slice(-4)}`
}

export function formatInrFromPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100)
}
