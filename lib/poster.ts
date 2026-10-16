/** Shared poster field checks — safe for server and client. */

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
