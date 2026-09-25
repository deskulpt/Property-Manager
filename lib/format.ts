export type Role = "applicant" | "landlord_admin" | "service_provider"
export type UnitStatus = "available" | "pending" | "leased"
export type ApplicationStatus = "submitted" | "approved" | "denied"
export type JobStatus = "open" | "assigned" | "accepted" | "complete"
export type Trade = "electrician" | "plumber" | "courier" | "cleaning"

export const TRADES: Trade[] = ["electrician", "plumber", "courier", "cleaning"]

export function money(cents: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100)
}

export function sqft(n: number) {
  return `${new Intl.NumberFormat("en-CA").format(n)} SF`
}

export function rateLabel(ratePsf: number) {
  return ratePsf.toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function monthlyRentCents(ratePsf: number, area: number) {
  return Math.round((ratePsf * area * 100) / 12)
}

export function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function firstOfNextMonth(from = new Date()) {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10)
}

export function formatDay(iso: string | null) {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

export function roleLabel(role: Role) {
  if (role === "landlord_admin") return "Landlord admin"
  if (role === "service_provider") return "Service provider"
  return "Applicant"
}

export function identityLabel(user: {
  name: string
  role: Role
  tenantName?: string | null
  trade?: string | null
  serviceArea?: string | null
}) {
  if (user.role === "landlord_admin") {
    return `${user.name} · ${user.tenantName ?? "Landlord"} admin`
  }
  if (user.role === "service_provider") {
    return `${user.name} · ${user.trade ?? "Trade"} · ${user.serviceArea ?? ""}`
  }
  return `${user.name} · Applicant`
}

export function statusLabel(status: string) {
  if (status === "available") return "Available"
  if (status === "pending") return "Offer pending"
  if (status === "leased") return "Leased"
  if (status === "submitted") return "In review"
  if (status === "approved") return "Approved"
  if (status === "denied") return "Denied"
  if (status === "open") return "Open"
  if (status === "assigned") return "Assigned"
  if (status === "accepted") return "Accepted"
  if (status === "complete") return "Complete"
  if (status === "due") return "Due"
  if (status === "paid") return "Paid"
  return status
}

export function lateFeeCents(
  rentCents: number,
  rule: { flatCents: number; percentBps: number },
) {
  const percent = Math.round((rentCents * rule.percentBps) / 10000)
  return Math.max(rule.flatCents, percent)
}
