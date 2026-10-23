import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { demoAuthAllowed } from "@/lib/auth/mode"
import { getUser } from "@/lib/db"
import { canImpersonate } from "@/lib/role-level"
import { requireSecretKey, sessionCookieOptions } from "@/lib/env"

export const SESSION_COOKIE = "deskulpt_user"
/** Sticky L0/L1 staff identity while impersonating demo desks. */
export const ADMIN_SESSION_COOKIE = "deskulpt_admin"
/** Managing agent selected landlord org. */
export const AGENT_TENANT_COOKIE = "deskulpt_agent_tenant"

function sign(userId: string) {
  return createHmac("sha256", requireSecretKey()).update(`v1:${userId}`).digest("base64url")
}

/** Mint a signed session value. Accepts raw user ids from legacy cookies for one release. */
export function mintSessionValue(userId: string) {
  return `v1.${userId}.${sign(userId)}`
}

export function parseSessionValue(raw: string | undefined | null): string | null {
  if (!raw) return null
  // New signed form: v1.<userId>.<sig>
  if (raw.startsWith("v1.")) {
    const parts = raw.split(".")
    if (parts.length !== 3) return null
    const [, userId, sig] = parts
    if (!userId || !sig) return null
    const expected = sign(userId)
    try {
      const a = Buffer.from(sig)
      const b = Buffer.from(expected)
      if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    } catch {
      return null
    }
    return userId
  }
  // Legacy unsigned cookies (dev only migration). Reject in production.
  if (process.env.NODE_ENV === "production") return null
  if (/^[a-zA-Z0-9_-]+$/.test(raw)) return raw
  return null
}

export async function getSessionUser() {
  const jar = await cookies()
  const id = parseSessionValue(jar.get(SESSION_COOKIE)?.value)
  if (!id) return null
  return getUser(id)
}

export async function getAdminSessionUser() {
  const jar = await cookies()
  const id = parseSessionValue(jar.get(ADMIN_SESSION_COOKIE)?.value)
  if (!id) return null
  const user = getUser(id)
  if (!user || !canImpersonate(user.roleLevel)) return null
  return user
}

export async function setSessionCookie(userId: string) {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, mintSessionValue(userId), sessionCookieOptions())
}

export async function setAdminSessionCookie(userId: string) {
  const jar = await cookies()
  jar.set(ADMIN_SESSION_COOKIE, mintSessionValue(userId), sessionCookieOptions())
}

export async function clearSessionCookies() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  jar.delete(ADMIN_SESSION_COOKIE)
  jar.delete(AGENT_TENANT_COOKIE)
}

export async function getAgentTenantId() {
  const jar = await cookies()
  return jar.get(AGENT_TENANT_COOKIE)?.value ?? null
}

export async function setAgentTenantCookie(tenantId: string) {
  const jar = await cookies()
  jar.set(AGENT_TENANT_COOKIE, tenantId, sessionCookieOptions())
}

export async function clearAgentTenantCookie() {
  const jar = await cookies()
  jar.delete(AGENT_TENANT_COOKIE)
}

/** Slice A helper — sets or clears the signed user session (not admin cookie). */
export async function setSessionUserId(userId: string | null) {
  if (!userId) {
    const jar = await cookies()
    jar.delete(SESSION_COOKIE)
    return
  }
  await setSessionCookie(userId)
}

/** Demo identity switcher — blocked in hosted mode unless ALLOW_DEMO_AUTH=1. */
export function demoSwitcherEnabled() {
  return demoAuthAllowed()
}
