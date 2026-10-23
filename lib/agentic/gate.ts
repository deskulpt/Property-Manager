import "server-only"
import { getDb } from "@/lib/db"

/**
 * Pro+ gate for Ask Easy (PRD §21.8).
 *
 * TODO(Slice A): when `subscription_package` lands on tenants (see
 * `lib/auth/packages.ts` on the auth branch — `askEasy: true` for pro/enterprise),
 * replace this soft path with `packageLimits(parsePackage(...)).askEasy`.
 *
 * Until then: OSS demo landlords are treated as Pro-capable so evaluators can
 * exercise the approval UI without hosted packages. Set `ASK_EASY_REQUIRE_PRO=1`
 * to force a hard deny (upgrade CTA) for every tenant.
 */

const PRO_PLUS = new Set(["pro", "enterprise", "portfolio"])

function tenantsHavePackageColumn(): boolean {
  const cols = getDb().prepare("PRAGMA table_info(tenants)").all() as { name: string }[]
  return cols.some((col) => col.name === "subscription_package")
}

export function tenantHasAskEasy(tenantId: string): boolean {
  if (process.env.ASK_EASY_REQUIRE_PRO === "1") {
    if (!tenantsHavePackageColumn()) return false
  }
  if (!tenantsHavePackageColumn()) {
    // Soft-open: Slice A packages not on this checkout.
    return true
  }
  const row = getDb()
    .prepare("SELECT subscription_package AS pkg FROM tenants WHERE id = ?")
    .get(tenantId) as { pkg?: string } | undefined
  const pkg = String(row?.pkg ?? "starter").toLowerCase()
  if (pkg === "basic") return false
  return PRO_PLUS.has(pkg)
}

export function askEasyGateReason(tenantId: string): "ok" | "upgrade" {
  return tenantHasAskEasy(tenantId) ? "ok" : "upgrade"
}
