"use client"

import { useActionState } from "react"
import Link from "next/link"
import { claimReferralAsLandlord, type LinkClaimState } from "@/lib/actions"
import { PROPERTY_TYPES } from "@/lib/referrals"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const initial: LinkClaimState = { error: null, fieldErrors: {} }

export function ReferralClaimForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(claimReferralAsLandlord, initial)

  if (state.ok) {
    return (
      <div className="border border-avail/30 bg-avail/10 px-5 py-8" role="status">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-avail">Attributed</p>
        <h2 className="mt-2 font-heading text-2xl font-extrabold">Property linked to {code}</h2>
        <p className="mt-2 text-ink-soft">
          A Path B indication is now <strong>New</strong> on the referrer dashboard. Full landlord signup
          billing credit ships later with Partner Affiliate.
        </p>
        <Link href="/listings" className="mt-5 inline-block font-heading text-sm font-bold text-terra underline">
          Browse listings
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="refCode" value={code} />
      {state.error ? (
        <p className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="propertyAddress">Property address</Label>
        <Textarea id="propertyAddress" name="propertyAddress" required rows={2} className="rounded-sm" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="propertyCity">City</Label>
          <Input id="propertyCity" name="propertyCity" required className="rounded-sm" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="propertyPin">PIN</Label>
          <Input id="propertyPin" name="propertyPin" required maxLength={6} className="rounded-sm" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="propertyType">Type</Label>
          <select
            id="propertyType"
            name="propertyType"
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
          <Label htmlFor="approxSqft">Approx sq ft</Label>
          <Input id="approxSqft" name="approxSqft" className="rounded-sm" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="askingRentInr">Asking rent ₹ / month</Label>
          <Input id="askingRentInr" name="askingRentInr" className="rounded-sm" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="landlordName">Your name</Label>
          <Input id="landlordName" name="landlordName" required className="rounded-sm" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="landlordPhone">Phone</Label>
          <Input id="landlordPhone" name="landlordPhone" required className="rounded-sm" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="landlordEmail">Email</Label>
          <Input id="landlordEmail" name="landlordEmail" type="email" className="rounded-sm" />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="w-fit rounded-sm bg-brand font-heading font-bold">
        {pending ? "Saving…" : "Add property with referral"}
      </Button>
    </form>
  )
}
