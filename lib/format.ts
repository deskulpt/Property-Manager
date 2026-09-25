export type MarketRole = "applicant" | "landlord_admin" | "service_provider"
export type StaffRole =
  | "super_admin"
  | "account_manager"
  | "service_manager"
  | "property_manager"
  | "merchandiser"
export type Role = MarketRole | StaffRole
export type UnitStatus = "available" | "pending" | "leased"
export type ApplicationStatus = "submitted" | "approved" | "denied"
export type JobStatus = "open" | "assigned" | "accepted" | "complete"
export type Trade = "electrician" | "plumber" | "courier" | "cleaning"
export type TenantKind = "landlord" | "platform"

export const TRADES: Trade[] = ["electrician", "plumber", "courier", "cleaning"]

export const STAFF_ROLES: StaffRole[] = [
  "super_admin",
  "account_manager",
  "service_manager",
  "property_manager",
  "merchandiser",
]

export const MARKET_ROLES: MarketRole[] = ["applicant", "landlord_admin", "service_provider"]

export function isStaffRole(role: string): role is StaffRole {
  return (STAFF_ROLES as string[]).includes(role)
}

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
  if (role === "super_admin") return "Super Admin"
  if (role === "account_manager") return "Account Manager"
  if (role === "service_manager") return "Service Manager"
  if (role === "property_manager") return "Property Manager"
  if (role === "merchandiser") return "Merchandiser"
  return "Applicant"
}

export function identityLabel(user: {
  name: string
  role: Role
  tenantName?: string | null
  trade?: string | null
  serviceArea?: string | null
}) {
  if (isStaffRole(user.role)) {
    return `${user.name} · DeSkulpt · ${roleLabel(user.role)}`
  }
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
  if (status === "rejected") return "Rejected"
  if (status === "verified") return "Verified"
  return status
}

export function lateFeeCents(
  rentCents: number,
  rule: { flatCents: number; percentBps: number },
) {
  const percent = Math.round((rentCents * rule.percentBps) / 10000)
  return Math.max(rule.flatCents, percent)
}

export function parseClearHeightFeet(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : 0
}

export function maskEmail(email: string | null | undefined) {
  if (!email) return null
  const at = email.indexOf("@")
  if (at <= 0) return "••••"
  return `••••@${email.slice(at + 1)}`
}
