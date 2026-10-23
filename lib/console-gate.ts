import "server-only"
import { redirect } from "next/navigation"
import type { SessionUser } from "@/lib/db"
import { canOpenConsole } from "@/lib/role-level"
import { getAdminSessionUser, getSessionUser } from "@/lib/session"

/**
 * Platform console requires an active L0/L1 session (not an impersonated desk identity).
 * If staff is mid-impersonation, send them home so the sticky bar can restore.
 */
export async function requirePlatformAdmin(): Promise<SessionUser> {
  const session = await getSessionUser()
  if (session && canOpenConsole(session.roleLevel)) return session
  const admin = await getAdminSessionUser()
  if (admin) redirect("/")
  redirect("/login")
}

export function isPlatformAdminUser(user: Pick<SessionUser, "roleLevel"> | null | undefined) {
  return Boolean(user && canOpenConsole(user.roleLevel))
}
