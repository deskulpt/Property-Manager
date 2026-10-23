"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/submit-button"
import { createAccountAction, type AuthFormState } from "@/lib/actions"
import { PACKAGE_LIMITS, type SubscriptionPackage } from "@/lib/auth/packages"

const initial: AuthFormState = { error: null, message: null, fieldErrors: {} }

const PACKAGES = (Object.keys(PACKAGE_LIMITS) as SubscriptionPackage[]).filter(
  (id) => id !== "enterprise",
)

export function CreateAccountForm({
  defaults,
}: {
  defaults: { contactName: string; contactEmail: string }
}) {
  const [state, action] = useActionState(createAccountAction, initial)
  return (
    <form action={action} className="grid gap-4" data-testid="create-account-form">
      <div className="grid gap-2">
        <Label htmlFor="legalName">Organisation legal name</Label>
        <Input id="legalName" name="legalName" required placeholder="Acme Logistics Parks Pvt Ltd" />
        {state.fieldErrors.legalName ? (
          <p className="text-sm text-destructive">{state.fieldErrors.legalName}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="city">City (India)</Label>
        <Input id="city" name="city" required placeholder="Pune" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="entityType">Entity type</Label>
        <Input id="entityType" name="entityType" required placeholder="Private limited" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="actingAs">Acting as</Label>
        <Input id="actingAs" name="actingAs" required placeholder="Director / authorised signatory" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contactName">Primary contact</Label>
        <Input id="contactName" name="contactName" defaultValue={defaults.contactName} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="contactEmail">Contact email</Label>
        <Input
          id="contactEmail"
          name="contactEmail"
          type="email"
          defaultValue={defaults.contactEmail}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="country">Country</Label>
        <select
          id="country"
          name="country"
          defaultValue="India"
          className="h-9 rounded-sm border border-ink/20 bg-card px-2 font-mono text-[12px]"
          data-testid="create-account-country"
        >
          <option value="India">India</option>
        </select>
        <p className="text-xs text-ink-faint">
          Public signup is India-only. Other markets stay off this form until the checklist clears.
        </p>
        {state.fieldErrors.country ? (
          <p className="text-sm text-destructive">{state.fieldErrors.country}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="packageId">Package</Label>
        <select
          id="packageId"
          name="packageId"
          defaultValue="starter"
          className="h-9 rounded-sm border border-ink/20 bg-card px-2 font-mono text-[12px]"
        >
          {PACKAGES.map((id) => (
            <option key={id} value={id}>
              {PACKAGE_LIMITS[id].label} · {PACKAGE_LIMITS[id].maxSeats} seats ·{" "}
              {PACKAGE_LIMITS[id].maxProperties}{" "}
              {PACKAGE_LIMITS[id].maxProperties === 1 ? "property" : "properties"}
            </option>
          ))}
        </select>
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton pendingLabel="Creating organisation…">Create account</SubmitButton>
    </form>
  )
}
