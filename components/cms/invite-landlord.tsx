"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/submit-button"
import { submitLandlordInvite, type InviteState } from "@/lib/actions"

const initial: InviteState = { error: null, notice: null }

export function InviteLandlordForm() {
  const [state, action] = useActionState(submitLandlordInvite, initial)
  return (
    <form action={action} className="grid max-w-xl gap-3 bg-card p-4 ring-1 ring-foreground/10">
      <div className="grid gap-2">
        <Label htmlFor="companyName">Company</Label>
        <Input id="companyName" name="companyName" placeholder="Northshore Logistics Realty" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="city">City</Label>
        <Input id="city" name="city" defaultValue="Mumbai" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="adminName">Admin name</Label>
        <Input id="adminName" name="adminName" placeholder="Alex Park" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="adminEmail">Admin email</Label>
        <Input id="adminEmail" name="adminEmail" placeholder="alex@northshore.example" />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.notice ? <p className="text-sm text-brand" role="status">{state.notice}</p> : null}
      <SubmitButton pendingLabel="Inviting…">Create demo landlord</SubmitButton>
    </form>
  )
}
