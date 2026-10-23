export type PosterPaper = "a4" | "letter"

export type PosterMissingField = "email" | "address" | "sqft"

export type PosterGate = {
  ok: boolean
  missing: PosterMissingField[]
  messages: string[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function publicUnitPath(slug: string, code: string) {
  return `/properties/${encodeURIComponent(slug)}/units/${encodeURIComponent(code)}`
}

export function publicPropertyPath(slug: string) {
  return `/properties/${encodeURIComponent(slug)}`
}

export function absolutePublicUrl(origin: string, path: string) {
  const base = origin.replace(/\/$/, "")
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

export function evaluatePosterGate(input: {
  email: string | null
  address: string | null
  sizeSqft: number | null
}): PosterGate {
  const missing: PosterMissingField[] = []
  const messages: string[] = []

  const email = input.email?.trim() ?? ""
  if (!email || !EMAIL_RE.test(email)) {
    missing.push("email")
    messages.push("Add a contact email before printing a poster.")
  }

  const address = input.address?.trim() ?? ""
  if (!address) {
    missing.push("address")
    messages.push("Add a property address before printing a poster.")
  }

  if (input.sizeSqft == null || !(input.sizeSqft > 0)) {
    missing.push("sqft")
    messages.push("Add unit size (sq ft) before printing a poster.")
  }

  return { ok: missing.length === 0, missing, messages }
}

/** Property poster area: sum unit sqft when every unit has area > 0; else null (blocks). */
export function propertyPosterSqft(units: { sqft: number }[]): number | null {
  if (units.length === 0) return null
  if (units.some((unit) => !(unit.sqft > 0))) return null
  return units.reduce((sum, unit) => sum + unit.sqft, 0)
}

export function paperLabel(paper: PosterPaper) {
  return paper === "letter" ? "US Letter" : "A4"
}

/** Shared poster field checks — safe for server and client (legacy unit poster UI). */
export function missingPosterFields(input: {
  contactEmail?: string | null
  address?: string | null
  sqft?: number | null
}): string[] {
  const missing: string[] = []
  if (!input.contactEmail?.trim()) missing.push("Landlord contact email")
  if (!input.address?.trim()) missing.push("Unit address")
  if (input.sqft == null || !Number.isFinite(input.sqft) || input.sqft <= 0) {
    missing.push("Size in sq ft")
  }
  return missing
}
