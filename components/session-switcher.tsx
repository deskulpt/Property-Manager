"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { switchSession } from "@/lib/actions"
import { identityLabel, type Role } from "@/lib/format"

export type SwitchUser = {
  id: string
  name: string
  role: Role
  tenantName: string | null
  trade: string | null
  serviceArea: string | null
}

/**
 * Native <select> on purpose: reliable without portal/hydration quirks,
 * and usable by keyboard and browser automation.
 */
export function SessionSwitcher({
  users,
  currentId,
}: {
  users: SwitchUser[]
  currentId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const value = currentId || "visitor"

  return (
    <div className="flex items-center gap-2">
      <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-terra sm:inline">
        Demo
      </span>
      <label className="sr-only" htmlFor="demo-identity">
        Demo identity
      </label>
      <select
        id="demo-identity"
        name="userId"
        aria-label="Demo identity"
        disabled={pending}
        value={value}
        className="h-9 w-[min(52vw,280px)] border border-input bg-card px-2 font-mono text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        onChange={(event) => {
          const next = event.target.value
          startTransition(async () => {
            await switchSession(next)
            router.refresh()
          })
        }}
      >
        <option value="visitor">Visitor · browse only</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {identityLabel(user)}
          </option>
        ))}
      </select>
    </div>
  )
}
