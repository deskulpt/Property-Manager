import "server-only"
import { getDb } from "@/lib/db"
import { packageHasAskEasy, parsePlanId, planHasEntitlement, type PlanId } from "@/lib/plans"

/**
 * Ask Easy / assistant entitlements gate (D02).
 *
 * Schema column is `tenants.package` (not `subscription_package`).
 *
 * Soft-open demo (labelled): when `ASK_EASY_SOFT_OPEN` is unset/1 and
 * `ASK_EASY_REQUIRE_PRO` is not set, evaluators may exercise the approval UI
 * without a paid package. Production / hard gate uses package entitlements:
 * Pro+ for draft/propose (`askEasy`).
 */

function readTenantPackage(tenantId: string): PlanId {
  const row = getDb()
    .prepare("SELECT package AS pkg FROM tenants WHERE id = ?")
    .get(tenantId) as { pkg?: string } | undefined
  return parsePlanId(row?.pkg)
}

/** Soft-open allowed unless hard-require is on. */
export function askEasySoftOpenEnabled(): boolean {
  if (process.env.ASK_EASY_REQUIRE_PRO === "1") return false
  if (process.env.ASK_EASY_SOFT_OPEN === "0") return false
  // Default: soft-open for demo/evaluators (labelled in UI).
  return true
}

export function tenantPackageId(tenantId: string): PlanId {
  return readTenantPackage(tenantId)
}

export function tenantHasEntitlement(
  tenantId: string,
  key: "assistant.read" | "assistant.draft" | "assistant.propose" | "automation.policies" | "mcp.access" | "api.access",
): boolean {
  if (askEasySoftOpenEnabled() && (key === "assistant.read" || key === "assistant.draft" || key === "assistant.propose")) {
    // Soft-open demo: allow assistant surface so evaluators can exercise approve UI.
    return true
  }
  return planHasEntitlement(readTenantPackage(tenantId), key)
}

/** Pro+ Ask Easy draft/propose desk (or labelled soft-open). */
export function tenantHasAskEasy(tenantId: string): boolean {
  if (askEasySoftOpenEnabled()) return true
  return packageHasAskEasy(readTenantPackage(tenantId))
}

export function askEasyGateReason(tenantId: string): "ok" | "upgrade" | "soft_open" {
  if (packageHasAskEasy(readTenantPackage(tenantId))) return "ok"
  if (askEasySoftOpenEnabled()) return "soft_open"
  return "upgrade"
}
