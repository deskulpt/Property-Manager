import "server-only"

import { agentCanAccessTenant, agentLandlords } from "@/lib/role-cms-store"
import { getAgentTenantId } from "@/lib/session"

/** Cookie landlord, else first invited landlord. */
export async function resolveAgentTenantId(agentUserId: string) {
  const landlords = agentLandlords(agentUserId)
  const cookieTenant = await getAgentTenantId()
  if (cookieTenant && agentCanAccessTenant(agentUserId, cookieTenant)) return cookieTenant
  return landlords[0]?.id ?? null
}
