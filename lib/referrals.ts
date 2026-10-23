/** Refer & Earn (§19A) — demo constants and status machine. No live bank payouts. */

export const REF_COOKIE = "er_ref"
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 90

/** Proposed publish reward: ₹2,000 (paise). */
export const PUBLISH_REWARD_PAISE = 200_000

/** Proposed lease reward: 5% of first-month rent (basis points). */
export const LEASE_REWARD_BPS = 500

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

export type RewardStatus = "accrued" | "payable" | "paid_demo"

export type PropertyType =
  | "warehouse"
  | "office"
  | "industrial_park"
  | "retail"
  | "other"

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "warehouse", label: "Warehouse" },
  { value: "office", label: "Office" },
  { value: "industrial_park", label: "Industrial park" },
  { value: "retail", label: "Retail" },
  { value: "other", label: "Other C&I" },
]

export const STATUS_LABELS: Record<IndicationStatus, string> = {
  new: "New",
  prospecting: "Prospecting",
  awaiting_media: "Awaiting media",
  published: "Published",
  in_negotiation: "In negotiation",
  leased: "Leased",
  discarded: "Discarded",
  deactivated: "Deactivated",
}

/** Happy-path forward steps (MVP). */
const FORWARD: Partial<Record<IndicationStatus, IndicationStatus>> = {
  new: "prospecting",
  prospecting: "awaiting_media",
  awaiting_media: "published",
  published: "in_negotiation",
  in_negotiation: "leased",
}

const TERMINAL: IndicationStatus[] = ["leased", "discarded", "deactivated"]

export function nextPipelineStatus(status: IndicationStatus): IndicationStatus | null {
  return FORWARD[status] ?? null
}

export function canTransition(from: IndicationStatus, to: IndicationStatus): boolean {
  if (from === to) return false
  if (TERMINAL.includes(from)) return false
  if (to === "deactivated") return true
  if (to === "discarded") {
    return (
      from === "new" ||
      from === "prospecting" ||
      from === "awaiting_media" ||
      from === "published" ||
      from === "in_negotiation"
    )
  }
  return FORWARD[from] === to
}

export function isReferEarnEnabled() {
  return process.env.REFER_EARN !== "0"
}

/** Events in month M become payable on the 15th of month M+1 (demo clock). */
export function fifteenthOfNextMonth(fromIso: string): string {
  const [y, m] = fromIso.slice(0, 10).split("-").map(Number)
  const next = new Date(Date.UTC(y, m, 15))
  return next.toISOString().slice(0, 10)
}

export function addAttributionDays(fromIso: string, days = ATTRIBUTION_DAYS): string {
  const [y, m, d] = fromIso.slice(0, 10).split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export function leaseRewardPaise(rentPaise: number): number {
  return Math.round((rentPaise * LEASE_REWARD_BPS) / 10_000)
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10) return `+91${digits}`
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`
  if (raw.trim().startsWith("+")) return `+${digits}`
  return digits ? `+${digits}` : ""
}

export function phonesEqual(a: string, b: string): boolean {
  const na = normalizePhone(a).replace(/\D/g, "")
  const nb = normalizePhone(b).replace(/\D/g, "")
  if (!na || !nb) return false
  return na === nb || na.endsWith(nb) || nb.endsWith(na)
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—"
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 4) return "••••"
  return `+${digits.slice(0, 2)} •••• ••${digits.slice(-4)}`
}

export function formatInrPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100)
}

export function referralLinkPath(code: string): string {
  return `/r/${encodeURIComponent(code.toUpperCase())}`
}

export function rewardStatusLabel(status: RewardStatus): string {
  if (status === "accrued") return "Accrued"
  if (status === "payable") return "Payable"
  return "Paid (demo)"
}
