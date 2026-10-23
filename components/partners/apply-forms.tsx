"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/submit-button"
import {
  submitAffiliateApply,
  submitPartnerRefer,
  submitServiceApply,
  type PartnerFormState,
} from "@/lib/partners/actions"
import { AFFILIATE_SUBTYPES, SERVICE_SUBTYPES } from "@/lib/partners/types"

const initial: PartnerFormState = { error: null, fieldErrors: {} }

function FieldError({ name, state }: { name: string; state: PartnerFormState }) {
  const msg = state.fieldErrors[name]
  if (!msg) return null
  return <p className="text-xs text-red-700">{msg}</p>
}

export function AffiliateApplyForm() {
  const [state, action] = useActionState(submitAffiliateApply, initial)
  return (
    <form action={action} className="grid gap-4 border border-ink/15 bg-card p-6">
      <DemoBanner />
      {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      <div className="grid gap-2">
        <Label htmlFor="subtype">Partner type</Label>
        <select id="subtype" name="subtype" required className="h-9 border border-input bg-background px-2 text-sm">
          {AFFILIATE_SUBTYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <FieldError name="subtype" state={state} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Legal / display name</Label>
          <Input id="name" name="name" required />
          <FieldError name="name" state={state} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone (+91)</Label>
          <Input id="phone" name="phone" placeholder="9876543210" required />
          <FieldError name="phone" state={state} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
        <FieldError name="email" state={state} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pins">Service PINs (comma-separated)</Label>
          <Input id="pins" name="pins" placeholder="560001, 560066" required />
          <FieldError name="pins" state={state} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="pan">PAN</Label>
          <Input id="pan" name="pan" placeholder="ABCDE1234F" required />
          <FieldError name="pan" state={state} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="aadhaarLast4">Aadhaar last 4 (demo)</Label>
          <Input id="aadhaarLast4" name="aadhaarLast4" maxLength={4} required />
          <FieldError name="aadhaarLast4" state={state} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="gstin">GSTIN (optional)</Label>
          <Input id="gstin" name="gstin" />
          <FieldError name="gstin" state={state} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="licenceRef">RERA / licence (optional)</Label>
          <Input id="licenceRef" name="licenceRef" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="portfolio">Portfolio / website (optional)</Label>
        <Input id="portfolio" name="portfolio" />
      </div>
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="aadhaarConsent" className="mt-1" required />
        I consent to a demo Aadhaar check (not a live UIDAI verification).
      </label>
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="ageConsent" className="mt-1" required />
        I confirm I am 18+ and the information is accurate.
      </label>
      <SubmitButton pendingLabel="Submitting…">Submit application</SubmitButton>
    </form>
  )
}

export function ServiceApplyForm() {
  const [state, action] = useActionState(submitServiceApply, initial)
  return (
    <form action={action} className="grid gap-4 border border-ink/15 bg-card p-6">
      <DemoBanner />
      {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      <div className="grid gap-2">
        <Label htmlFor="subtype">Trade</Label>
        <select id="subtype" name="subtype" required className="h-9 border border-input bg-background px-2 text-sm">
          {SERVICE_SUBTYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone (+91)</Label>
          <Input id="phone" name="phone" required />
          <FieldError name="phone" state={state} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="city">Home city</Label>
          <Input id="city" name="city" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="homePin">Home-base PIN</Label>
          <Input id="homePin" name="homePin" required />
          <FieldError name="homePin" state={state} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="radiusKm">Radius km</Label>
          <Input id="radiusKm" name="radiusKm" type="number" defaultValue={25} min={5} max={100} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="extraPins">Additional PIN prefixes</Label>
        <Input id="extraPins" name="extraPins" placeholder="4110, 4121" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="pan">PAN</Label>
          <Input id="pan" name="pan" required />
          <FieldError name="pan" state={state} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="aadhaarLast4">Aadhaar last 4 (demo)</Label>
          <Input id="aadhaarLast4" name="aadhaarLast4" maxLength={4} required />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="gstin">GSTIN (optional)</Label>
          <Input id="gstin" name="gstin" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tradeDoc">Trade doc filename stub (optional)</Label>
          <Input id="tradeDoc" name="tradeDoc" placeholder="electrician-cert.pdf" />
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="aadhaarConsent" className="mt-1" required />
        I consent to a demo Aadhaar check (not live UIDAI).
      </label>
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="onboardingAck" className="mt-1" required />I acknowledge site safety /
        SOP checklist (quizzes later).
      </label>
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="ageConsent" className="mt-1" required />
        I am 18+ and information is accurate.
      </label>
      <SubmitButton pendingLabel="Submitting…">Submit application</SubmitButton>
    </form>
  )
}

export function PartnerReferForm() {
  const [state, action] = useActionState(submitPartnerRefer, initial)
  return (
    <form action={action} className="grid gap-4 border border-ink/15 bg-card p-6">
      {state.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <fieldset className="grid gap-3">
          <legend className="font-semibold text-ink">You (referrer)</legend>
          <Input name="referrerName" placeholder="Name" required />
          <Input name="referrerPhone" placeholder="Phone +91" required />
          <FieldError name="referrerPhone" state={state} />
          <Input name="referrerEmail" type="email" placeholder="Email" required />
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="font-semibold text-ink">Person you refer</legend>
          <Input name="referredName" placeholder="Name" required />
          <Input name="referredPhone" placeholder="Phone +91" required />
          <FieldError name="referredPhone" state={state} />
          <Input name="referredEmail" type="email" placeholder="Email" required />
        </fieldset>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="track">Track</Label>
          <select id="track" name="track" className="h-9 border border-input bg-background px-2 text-sm" required>
            <option value="service">Service provider</option>
            <option value="affiliate">Affiliate</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="subtype">Type / trade</Label>
          <select id="subtype" name="subtype" className="h-9 border border-input bg-background px-2 text-sm" required>
            {[...SERVICE_SUBTYPES, ...AFFILIATE_SUBTYPES].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <FieldError name="subtype" state={state} />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input name="city" placeholder="City" required />
        <Input name="pin" placeholder="PIN" required />
      </div>
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="consent" className="mt-1" required />I have permission to share their
        contact for Easy Rental to invite them.
      </label>
      <p className="text-xs text-ink-faint">
        Referring properties (listings)? Use{" "}
        <Link href="/refer" className="text-terra underline">
          Refer & Earn
        </Link>{" "}
        instead.
      </p>
      <SubmitButton pendingLabel="Sending…">Submit referral</SubmitButton>
    </form>
  )
}

function DemoBanner() {
  return (
    <p className="border border-terra/30 bg-terra/5 px-3 py-2 text-xs text-ink-soft">
      Identity checks are simulated for demo — not a live government verification.
    </p>
  )
}
