"use client"

import { useActionState } from "react"
import Link from "next/link"
import { submitReferralIndication, type ReferSubmitState } from "@/lib/actions"
import { PROPERTY_TYPES } from "@/lib/referrals"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const initial: ReferSubmitState = { error: null, fieldErrors: {} }

export function ReferSubmitForm({
  defaults,
}: {
  defaults?: {
    referrerName?: string
    referrerPhone?: string
    referrerEmail?: string
  }
}) {
  const [state, action, pending] = useActionState(submitReferralIndication, initial)

  if (state.ok) {
    return (
      <div className="border border-avail/30 bg-avail/10 px-5 py-8" role="status">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-avail">Submitted</p>
        <h2 className="mt-2 font-heading text-2xl font-extrabold">Indication received</h2>
        <p className="mt-2 max-w-lg text-ink-soft">
          Status starts at <strong>New</strong>. We will confirm owner consent and move the lead through
          Prospecting → Awaiting media → Published.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/refer/dashboard"
            className="inline-flex h-9 items-center bg-brand px-4 font-heading text-sm font-bold text-paper"
          >
            Open dashboard
          </Link>
          <Link
            href="/refer/submit"
            className="inline-flex h-9 items-center border border-ink/20 px-4 font-heading text-sm font-bold"
          >
            Submit another
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form action={action} className="grid gap-6">
      {state.error ? (
        <p className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <fieldset className="grid gap-4">
        <legend className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">Property</legend>
        <div className="grid gap-2">
          <Label htmlFor="propertyAddress">Address / plot</Label>
          <Textarea id="propertyAddress" name="propertyAddress" required rows={2} className="rounded-sm" />
          {state.fieldErrors.propertyAddress ? (
            <p className="text-sm text-destructive">{state.fieldErrors.propertyAddress}</p>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="propertyCity">City</Label>
            <Input id="propertyCity" name="propertyCity" required className="rounded-sm" />
            {state.fieldErrors.propertyCity ? (
              <p className="text-sm text-destructive">{state.fieldErrors.propertyCity}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="propertyPin">PIN</Label>
            <Input id="propertyPin" name="propertyPin" inputMode="numeric" maxLength={6} required className="rounded-sm" />
            {state.fieldErrors.propertyPin ? (
              <p className="text-sm text-destructive">{state.fieldErrors.propertyPin}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="propertyType">Type</Label>
            <select
              id="propertyType"
              name="propertyType"
              required
              defaultValue="warehouse"
              className="h-8 rounded-sm border border-input bg-background px-2 text-sm"
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="approxSqft">Approx sq ft (optional)</Label>
            <Input id="approxSqft" name="approxSqft" inputMode="numeric" className="rounded-sm" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="askingRentInr">Asking rent ₹ / month (optional)</Label>
            <Input id="askingRentInr" name="askingRentInr" inputMode="numeric" className="rounded-sm" />
          </div>
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">Landlord</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="landlordName">Name</Label>
            <Input id="landlordName" name="landlordName" required className="rounded-sm" />
            {state.fieldErrors.landlordName ? (
              <p className="text-sm text-destructive">{state.fieldErrors.landlordName}</p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="landlordPhone">Phone (+91)</Label>
            <Input id="landlordPhone" name="landlordPhone" required placeholder="+91…" className="rounded-sm" />
            {state.fieldErrors.landlordPhone ? (
              <p className="text-sm text-destructive">{state.fieldErrors.landlordPhone}</p>
            ) : null}
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="landlordEmail">Email (optional)</Label>
          <Input id="landlordEmail" name="landlordEmail" type="email" className="rounded-sm" />
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="consent"
            value="on"
            required
            className="mt-1 size-4 rounded-sm border-ink/30"
          />
          <span>
            I confirm the owner consented to be contacted about listing this property on Easy Rental.
            {state.fieldErrors.consent ? (
              <span className="mt-1 block text-destructive">{state.fieldErrors.consent}</span>
            ) : null}
          </span>
        </label>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">You (referrer)</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="referrerName">Name</Label>
            <Input
              id="referrerName"
              name="referrerName"
              required
              defaultValue={defaults?.referrerName}
              className="rounded-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="referrerPhone">Phone</Label>
            <Input
              id="referrerPhone"
              name="referrerPhone"
              required
              defaultValue={defaults?.referrerPhone}
              className="rounded-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="referrerEmail">Email</Label>
            <Input
              id="referrerEmail"
              name="referrerEmail"
              type="email"
              required
              defaultValue={defaults?.referrerEmail}
              className="rounded-sm"
            />
          </div>
        </div>
      </fieldset>

      <Button type="submit" disabled={pending} className="w-fit rounded-sm bg-brand px-6 font-heading font-bold">
        {pending ? "Submitting…" : "Submit indication"}
      </Button>
    </form>
  )
}
