"use client"

import { useActionState, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SubmitButton } from "@/components/submit-button"
import { createListingProperty, type CreateListingState } from "@/lib/actions"
import {
  PROPERTY_SEGMENTS,
  PROPERTY_SUBTYPES,
  leaseProfile,
  segmentLabel,
  type PropertySegment,
} from "@/lib/listing-schemas"

const initial: CreateListingState = { error: null, fieldErrors: {} }

export function CreatePropertyForm() {
  const [segment, setSegment] = useState<PropertySegment>("warehouse")
  const [state, action] = useActionState(createListingProperty, initial)
  const subtypes = PROPERTY_SUBTYPES[segment]
  const profile = leaseProfile(segment)

  return (
    <form action={action} className="grid max-w-2xl gap-5 bg-card p-5 ring-1 ring-foreground/10">
      <div className="grid gap-2">
        <Label htmlFor="segment">Segment</Label>
        <select
          id="segment"
          name="segment"
          className="h-9 border border-input bg-background px-2 text-sm"
          value={segment}
          onChange={(event) => setSegment(event.target.value as PropertySegment)}
        >
          {PROPERTY_SEGMENTS.map((value) => (
            <option key={value} value={value}>
              {segmentLabel(value)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="subtype">Subtype</Label>
        <select id="subtype" name="subtype" className="h-9 border border-input bg-background px-2 text-sm" defaultValue={subtypes[0]}>
          {subtypes.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="name">Property name</Label>
        <Input id="name" name="name" placeholder="Forum Mall Storefronts" required />
        {state.fieldErrors?.name ? <p className="text-sm text-destructive">{state.fieldErrors.name}</p> : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" placeholder="Kukatpally, Hyderabad, Telangana 500072" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="area">Area / micro-market</Label>
          <Input id="area" name="area" placeholder="Kukatpally" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cityLine">City line</Label>
          <Input id="cityLine" name="cityLine" placeholder="HYDERABAD · PIN 500072" required />
        </div>
      </div>

      <fieldset className="grid gap-3 border border-ink/10 p-4">
        <legend className="px-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
          First unit
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="unitCode">Unit code</Label>
            <Input id="unitCode" name="unitCode" placeholder={segment === "residential" ? "3B" : "A1"} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sqft">{segment === "warehouse" ? "Area (SF)" : "Listed area (SF)"}</Label>
            <Input id="sqft" name="sqft" inputMode="numeric" required />
          </div>
        </div>
        {segment === "warehouse" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="ratePsf">₹ / SF · month</Label>
                <Input id="ratePsf" name="ratePsf" inputMode="decimal" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="clearHeight">Clear height</Label>
                <Input id="clearHeight" name="clearHeight" placeholder="28'" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="docks">Docks</Label>
                <Input id="docks" name="docks" inputMode="numeric" defaultValue="0" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="driveIns">Drive-ins</Label>
                <Input id="driveIns" name="driveIns" inputMode="numeric" defaultValue="0" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="power">Power</Label>
                <Input id="power" name="power" placeholder="400A / 415V" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="monthlyRent">Monthly rent (₹)</Label>
                <Input id="monthlyRent" name="monthlyRent" inputMode="numeric" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="carpetSqft">Carpet (SF)</Label>
                <Input id="carpetSqft" name="carpetSqft" inputMode="numeric" />
              </div>
            </div>
            {segment === "residential" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="bhk">BHK</Label>
                  <Input id="bhk" name="bhk" inputMode="numeric" defaultValue="2" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="furnishing">Furnishing</Label>
                  <select id="furnishing" name="furnishing" className="h-9 border border-input bg-background px-2 text-sm">
                    <option value="unfurnished">Unfurnished</option>
                    <option value="semi">Semi</option>
                    <option value="fully">Fully</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="depositMonths">Deposit (months)</Label>
                  <Input
                    id="depositMonths"
                    name="depositMonths"
                    inputMode="decimal"
                    defaultValue={String(profile.defaultDepositMonths ?? 3)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="maintenance">Maintenance ₹/mo</Label>
                  <Input id="maintenance" name="maintenance" inputMode="numeric" defaultValue="0" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="frontageFt">Frontage (ft)</Label>
                  <Input id="frontageFt" name="frontageFt" inputMode="numeric" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fitOut">Fit-out</Label>
                  <select id="fitOut" name="fitOut" className="h-9 border border-input bg-background px-2 text-sm">
                    <option value="bare_shell">Bare shell</option>
                    <option value="warm_shell">Warm shell</option>
                    <option value="fitted">Fitted</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mallName">Mall / building name</Label>
                  <Input id="mallName" name="mallName" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="floor">Floor</Label>
                  <Input id="floor" name="floor" placeholder="L1" />
                </div>
              </div>
            )}
          </>
        )}
        <div className="grid gap-2">
          <Label htmlFor="description">Unit description</Label>
          <Textarea id="description" name="description" required rows={3} />
        </div>
      </fieldset>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton pendingLabel="Saving…">Create property + unit</SubmitButton>
    </form>
  )
}
