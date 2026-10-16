import "server-only"
import { headers } from "next/headers"
import { listCustomDomains } from "@/lib/db"

/** Prefer active PRO custom domain; else current request origin (e.g. http://127.0.0.1:3505). */
export async function publicOriginForTenant(tenantId: string): Promise<string> {
  const active = listCustomDomains(tenantId).find(
    (domain) => domain.status === "active" || domain.status === "verified",
  )
  if (active) return `https://${active.hostname}`
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const proto = h.get("x-forwarded-proto") ?? (host?.includes("localhost") || host?.startsWith("127.") ? "http" : "https")
  if (host) return `${proto}://${host}`
  return "http://127.0.0.1:3505"
}

export function unitPublicPath(propertySlug: string, unitCode: string) {
  return `/properties/${propertySlug}/units/${unitCode}`
}

export function unitApplyPath(unitId: string) {
  return `/apply/${unitId}`
}

export async function unitListingUrl(
  tenantId: string,
  propertySlug: string,
  unitCode: string,
): Promise<string> {
  const origin = await publicOriginForTenant(tenantId)
  return `${origin}${unitPublicPath(propertySlug, unitCode)}`
}

export async function unitApplyUrl(tenantId: string, unitId: string): Promise<string> {
  const origin = await publicOriginForTenant(tenantId)
  return `${origin}${unitApplyPath(unitId)}`
}
