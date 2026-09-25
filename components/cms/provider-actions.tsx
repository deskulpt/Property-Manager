"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SubmitButton } from "@/components/submit-button"
import { submitPlatformApproval } from "@/lib/actions"

export function ProviderApprovalForm({
  providerId,
  landlords,
}: {
  providerId: string
  landlords: { id: string; name: string }[]
}) {
  const [tenantId, setTenantId] = useState(landlords[0]?.id ?? "")
  const items = landlords.map((item) => ({ value: item.id, label: item.name }))
  if (items.length === 0) return null
  return (
    <form action={submitPlatformApproval} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="providerId" value={providerId} />
      <input type="hidden" name="tenantId" value={tenantId} />
      <input type="hidden" name="status" value="approved" />
      <Select items={items} value={tenantId} onValueChange={(value) => value && setTenantId(String(value))}>
        <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <SubmitButton pendingLabel="Approving…">Approve for landlord</SubmitButton>
    </form>
  )
}
