import "server-only"
import { cookies } from "next/headers"
import { getUser } from "@/lib/db"

export const SESSION_COOKIE = "deskulpt_user"

export async function getSessionUser() {
  const jar = await cookies()
  const id = jar.get(SESSION_COOKIE)?.value
  if (!id) return null
  return getUser(id)
}
