import "server-only"
import { cookies } from "next/headers"
import { getUser } from "@/lib/db"

export const SESSION_COOKIE = "deskulpt_user"
/** Set on password login as super_admin; keeps the role switcher while impersonating. */
export const ADMIN_SESSION_COOKIE = "deskulpt_admin"

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

/** Super-admin who unlocked the sticky role switcher (may differ from view identity). */
export async function getAdminSessionUser() {
  const jar = await cookies()
  const id = jar.get(ADMIN_SESSION_COOKIE)?.value
  if (!id) return null
  const user = getUser(id)
  if (!user || user.role !== "super_admin") return null
  return user
}

export async function setSessionCookie(userId: string) {
  const jar = await cookies()
  jar.set(SESSION_COOKIE, userId, COOKIE_OPTS)
}

export async function setAdminSessionCookie(userId: string) {
  const jar = await cookies()
  jar.set(ADMIN_SESSION_COOKIE, userId, COOKIE_OPTS)
}

export async function clearSessionCookies() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  jar.delete(ADMIN_SESSION_COOKIE)
}
