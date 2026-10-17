import "server-only"
import { redirect } from "next/navigation"
import type { SessionUser } from "@/lib/db"
import { getAdminSessionUser, getSessionUser } from "@/lib/session"

/** Platform console requires an active super_admin session (not impersonation). */
export async function requirePlatformAdmin(): Promise<SessionUser> {
  const session = await getSessionUser()
  if (session?.role === "super_admin") return session
  const admin = await getAdminSessionUser()
  if (admin) {
    // Impersonating — send back to sticky switcher home rather than leaking console.
    redirect("/")
  }
  redirect("/login")
}

export function isPlatformAdminRole(role: string | null | undefined) {
  return role === "super_admin"
}
