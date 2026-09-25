"use client"

import { useTransition } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

export function SessionSwitcher({
  users,
  currentId,
}: {
  users: SwitchUser[]
  currentId: string
}) {
  const [pending, startTransition] = useTransition()
  const items = [
    { value: "visitor", label: "Visitor · browse only" },
    ...users.map((user) => ({ value: user.id, label: identityLabel(user) })),
  ]
  const value = currentId || "visitor"

  return (
    <div className="flex items-center gap-2">
      <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-terra sm:inline">
        Demo
      </span>
      <Select
        items={items}
        value={value}
        disabled={pending}
        onValueChange={(next) => {
          if (typeof next !== "string" || next === value) return
          startTransition(() => {
            void switchSession(next)
          })
        }}
      >
        <SelectTrigger
          className="h-9 w-[min(52vw,280px)] bg-card font-mono text-[11px]"
          aria-label="Demo identity"
        >
          <SelectValue placeholder="Choose a demo identity" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
