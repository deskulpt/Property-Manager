import "server-only"

import { agentCanAccessTenant, resolveAgentTenantId } from "@/lib/agent-context"
import type { SessionUser } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export type ImportActor = {
  user: SessionUser
  tenantId: string
}

/** Landlord admin (own org) or managing agent (invited org). */
export async function resolveImportActor(
  preferredTenantId?: string | null,
): Promise<ImportActor | { error: string; status: number }> {
  const user = await getSessionUser()
  if (!user) {
    return { error: "Sign in as a landlord admin or managing agent.", status: 401 }
  }

  if (user.role === "landlord_admin") {
    if (!user.tenantId) {
      return { error: "Landlord seat has no organisation.", status: 403 }
    }
    if (preferredTenantId && preferredTenantId !== user.tenantId) {
      return { error: "Landlords can only import into their own organisation.", status: 403 }
    }
    return { user, tenantId: user.tenantId }
  }

  if (user.role === "managing_agent") {
    const tenantId =
      preferredTenantId && agentCanAccessTenant(user.id, preferredTenantId)
        ? preferredTenantId
        : await resolveAgentTenantId(user.id)
    if (!tenantId) {
      return { error: "Select a managed landlord before importing.", status: 403 }
    }
    if (!agentCanAccessTenant(user.id, tenantId)) {
      return { error: "Not invited to that landlord organisation.", status: 403 }
    }
    return { user, tenantId }
  }

  return { error: "Only landlord admins and managing agents can import listings.", status: 403 }
}
