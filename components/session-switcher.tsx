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
 * Native <select> inside a <form>. Changing the value submits the form so
 * the server action always runs — including when automation sets .value and
 * calls requestSubmit() without a React synthetic onChange.
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
    <div className="flex items-center gap-1.5">
      <span className="hidden text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint sm:inline">
        Demo
      </span>
      <form
        data-testid="demo-identity-form"
        action={async (formData) => {
          const next = String(formData.get("userId") ?? "visitor")
          await switchSession(next)
        }}
        onSubmit={(event) => {
          event.preventDefault()
          const form = event.currentTarget
          const next = String(new FormData(form).get("userId") ?? "visitor")
          startTransition(async () => {
            await switchSession(next)
            router.refresh()
          })
        }}
      >
        <label className="sr-only" htmlFor="demo-identity">
          Demo identity
        </label>
        <select
          id="demo-identity"
          name="userId"
          aria-label="Demo identity switcher"
          data-testid="demo-identity"
          disabled={pending}
          defaultValue={value}
          key={value}
          className="h-8 max-w-[200px] rounded-sm border border-ink/15 bg-paper px-1.5 text-[11px] text-ink-soft outline-none focus-visible:ring-2 focus-visible:ring-terra/40 disabled:opacity-50"
          onChange={(event) => {
            event.currentTarget.form?.requestSubmit()
          }}
        >
          <option value="visitor">Visitor · browse only</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {identityLabel(user)}
            </option>
          ))}
        </select>
      </form>
    </div>
  )
}
