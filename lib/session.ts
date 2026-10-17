import "server-only"
import { cookies } from "next/headers"
import { getUser } from "@/lib/db"

export const SESSION_COOKIE = "deskulpt_user"
/** Managing agent selected landlord org. */
export const AGENT_TENANT_COOKIE = "deskulpt_agent_tenant"

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
}

export async function getSessionUser() {
  const jar = await cookies()
  const id = jar.get(SESSION_COOKIE)?.value
  if (!id) return null
  return getUser(id)
}

export async function getAgentTenantId() {
  const jar = await cookies()
  return jar.get(AGENT_TENANT_COOKIE)?.value ?? null
}

export async function setAgentTenantCookie(tenantId: string) {
  const jar = await cookies()
  jar.set(AGENT_TENANT_COOKIE, tenantId, COOKIE_OPTS)
}

export async function clearAgentTenantCookie() {
  const jar = await cookies()
  jar.delete(AGENT_TENANT_COOKIE)
}
