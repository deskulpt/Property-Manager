/**
 * Authorization for `/files/...` delivery.
 * Open reads are forbidden — every path requires a session principal and
 * tenant (or staff / envelope) scope.
 */
import { agentCanAccessTenant } from "@/lib/agent-context"
import { getDb, type SessionUser } from "@/lib/db"
import { isStaffRole } from "@/lib/format"
import { isSafeObjectKey } from "@/lib/object-store"

export type FileAccessDecision =
  | { ok: true; reason: string }
  | { ok: false; status: 401 | 403 | 404; reason: string }

/** Tenant-scoped ObjectStore keys: `{tenantId}/{kind}/{file}`. */
export function tenantIdFromObjectKey(parts: string[]): string | null {
  if (parts.length < 2) return null
  const key = parts.join("/")
  if (!isSafeObjectKey(key)) return null
  return parts[0] ?? null
}

function staffMayRead(user: SessionUser): boolean {
  return isStaffRole(user.role) && user.roleLevel <= 1
}

function userMayAccessTenant(user: SessionUser, tenantId: string): boolean {
  if (staffMayRead(user)) return true
  if (user.tenantId && user.tenantId === tenantId) return true
  if (user.role === "managing_agent" && agentCanAccessTenant(user.id, tenantId)) return true
  return false
}

/** Look up esign envelope tenant + occupant for `/files/esign/<id>.txt`. */
export function esignEnvelopeScope(envelopeFileName: string): {
  tenantId: string
  occupantId: string
} | null {
  const id = envelopeFileName.replace(/\.txt$/i, "")
  if (!/^[a-zA-Z0-9._-]+$/.test(id)) return null
  const row = getDb()
    .prepare(`SELECT tenant_id, occupant_id FROM esign_envelopes WHERE id = ?`)
    .get(id) as { tenant_id?: string; occupant_id?: string } | undefined
  if (!row?.tenant_id || !row.occupant_id) return null
  return { tenantId: String(row.tenant_id), occupantId: String(row.occupant_id) }
}

/**
 * Decide whether `user` may read the path segments under `/files/...`.
 * Call only after authentication; pass `user=null` for anonymous → 401.
 */
export function authorizeFileParts(
  user: SessionUser | null,
  parts: string[],
): FileAccessDecision {
  if (!user) {
    return { ok: false, status: 401, reason: "authentication_required" }
  }
  if (parts.length === 0) {
    return { ok: false, status: 404, reason: "empty_path" }
  }
  if (parts.some((p) => p.includes("..") || p.includes("/") || p.includes("\\"))) {
    return { ok: false, status: 404, reason: "unsafe_path" }
  }

  // demo eSign stamps: /files/esign/<envelopeId>.txt
  if (parts.length === 2 && parts[0] === "esign") {
    const name = parts[1]!
    if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
      return { ok: false, status: 404, reason: "unsafe_esign_name" }
    }
    const scope = esignEnvelopeScope(name)
    if (!scope) {
      // Missing DB row — fail closed (no open read of orphan stamps).
      return { ok: false, status: 404, reason: "esign_not_found" }
    }
    if (user.id === scope.occupantId) {
      return { ok: true, reason: "esign_occupant" }
    }
    if (userMayAccessTenant(user, scope.tenantId)) {
      return { ok: true, reason: "esign_tenant" }
    }
    return { ok: false, status: 404, reason: "esign_forbidden" }
  }

  const key = parts.join("/")
  const legacyOk = parts.length === 1 && /^[a-zA-Z0-9._-]+$/.test(parts[0]!)
  if (!legacyOk && !isSafeObjectKey(key)) {
    return { ok: false, status: 404, reason: "unsafe_key" }
  }

  // Legacy flat uploads have no tenant segment — staff only (fail-closed).
  if (legacyOk) {
    if (staffMayRead(user)) return { ok: true, reason: "legacy_staff" }
    return { ok: false, status: 404, reason: "legacy_forbidden" }
  }

  const tenantId = tenantIdFromObjectKey(parts)
  if (!tenantId) {
    return { ok: false, status: 404, reason: "missing_tenant" }
  }
  if (!userMayAccessTenant(user, tenantId)) {
    // Same status as missing — no cross-tenant existence leak.
    return { ok: false, status: 404, reason: "tenant_forbidden" }
  }
  return { ok: true, reason: "tenant_scoped" }
}
