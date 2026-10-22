import "server-only"

import { getDb } from "@/lib/db"
import { getAgentTenantId } from "@/lib/session"

function asRows(values: unknown[]) {
  return values.map((value) => ({ ...(value as object) }) as Record<string, unknown>)
}

export function agentLandlords(agentUserId: string) {
  return asRows(
    getDb()
      .prepare(
        `SELECT t.id, t.name, t.slug, t.city,
                (SELECT COUNT(*) FROM properties p WHERE p.tenant_id = t.id) AS property_count
         FROM agent_landlord_access x
         JOIN tenants t ON t.id = x.tenant_id
         WHERE x.agent_user_id = ?
         ORDER BY t.name`,
      )
      .all(agentUserId),
  ).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    city: String(row.city),
    propertyCount: Number(row.property_count),
  }))
}

export function agentCanAccessTenant(agentUserId: string, tenantId: string) {
  const row = getDb()
    .prepare(
      "SELECT 1 AS ok FROM agent_landlord_access WHERE agent_user_id = ? AND tenant_id = ?",
    )
    .get(agentUserId, tenantId) as { ok?: number } | undefined
  return Boolean(row?.ok)
}

/** Cookie landlord, else first invited landlord. */
export async function resolveAgentTenantId(agentUserId: string) {
  const landlords = agentLandlords(agentUserId)
  const cookieTenant = await getAgentTenantId()
  if (cookieTenant && agentCanAccessTenant(agentUserId, cookieTenant)) return cookieTenant
  return landlords[0]?.id ?? null
}
