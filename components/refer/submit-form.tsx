"use client"

import { useActionState } from "react"
import { submitIndication, type ReferralFormState } from "@/lib/actions"
import { PROPERTY_TYPES } from "@/lib/referrals"
import { SubmitButton } from "@/components/submit-button"

const initial: ReferralFormState = {}

export function SubmitIndicationForm({ defaultPartnerCode }: { defaultPartnerCode?: string }) {
  const [state, action] = useActionState(submitIndication, initial)

  if (state.ok) {
    return (
      <div className="border border-avail/30 bg-avail/10 px-5 py-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-avail">Submitted</p>
        <h2 className="mt-2 font-serif text-xl font-semibold text-ink">Indication received</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Status starts at <span className="font-semibold text-ink">New</span>. We contact the
          landlord only with the consent you confirmed. Track progress on the dashboard.
        </p>
        <a
          href="/refer/dashboard"
          className="mt-5 inline-block bg-brand px-4 py-2.5 text-sm font-semibold text-paper hover:bg-brand-deep"
        >
          Open dashboard
        </a>
      </div>
    )
  }

  return (
    <form action={action} className="grid gap-4">
      {defaultPartnerCode ? (
        <input type="hidden" name="partnerCode" value={defaultPartnerCode} />
      ) : null}
      {state.error ? (
        <p className="border border-terra/40 bg-terra/10 px-3 py-2 text-sm text-ink">{state.error}</p>
      ) : null}

      <fieldset className="grid gap-4 border border-ink/10 bg-card p-4 md:p-5">
        <legend className="px-1 font-mono text-[11px] uppercase tracking-[0.16em] text-terra">
          Property
        </legend>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Type</span>
          <select
            name="propertyType"
            required
            defaultValue="warehouse"
            className="h-10 border border-ink/20 bg-paper px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Address (optional)</span>
          <input
            name="address"
            className="h-10 border border-ink/20 bg-paper px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Area / locality</span>
            <input
              name="area"
              required
              className="h-10 border border-ink/20 bg-paper px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
            />
            {state.fieldErrors?.area ? (
              <span className="text-xs text-terra">{state.fieldErrors.area}</span>
            ) : null}
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">City</span>
            <input
              name="city"
              required
              className="h-10 border border-ink/20 bg-paper px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
            />
            {state.fieldErrors?.city ? (
              <span className="text-xs text-terra">{state.fieldErrors.city}</span>
            ) : null}
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">PIN</span>
            <input
              name="pin"
              required
              inputMode="numeric"
              pattern="\d{6}"
              placeholder="560066"
              className="h-10 border border-ink/20 bg-paper px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
            />
            {state.fieldErrors?.pin ? (
              <span className="text-xs text-terra">{state.fieldErrors.pin}</span>
            ) : null}
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Approx. SF (optional)</span>
            <input
              name="approxSqft"
              inputMode="numeric"
              className="h-10 border border-ink/20 bg-paper px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Asking rent INR / month (optional)</span>
            <input
              name="rentAskInr"
              inputMode="numeric"
              placeholder="e.g. 2800000"
              className="h-10 border border-ink/20 bg-paper px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="grid gap-4 border border-ink/10 bg-card p-4 md:p-5">
        <legend className="px-1 font-mono text-[11px] uppercase tracking-[0.16em] text-terra">
          Landlord
        </legend>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Name</span>
          <input
            name="landlordName"
            required
            className="h-10 border border-ink/20 bg-paper px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
          />
          {state.fieldErrors?.landlordName ? (
            <span className="text-xs text-terra">{state.fieldErrors.landlordName}</span>
          ) : null}
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Phone (+91)</span>
            <input
              name="landlordPhone"
              required
              placeholder="+9198XXXXXXXX"
              className="h-10 border border-ink/20 bg-paper px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
            />
            {state.fieldErrors?.landlordPhone ? (
              <span className="text-xs text-terra">{state.fieldErrors.landlordPhone}</span>
            ) : null}
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Email (optional)</span>
            <input
              name="landlordEmail"
              type="email"
              className="h-10 border border-ink/20 bg-paper px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="grid gap-4 border border-ink/10 bg-card p-4 md:p-5">
        <legend className="px-1 font-mono text-[11px] uppercase tracking-[0.16em] text-terra">
          Your details
        </legend>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Name</span>
          <input
            name="referrerName"
            required
            defaultValue="Asha Reddy"
            className="h-10 border border-ink/20 bg-paper px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Phone (+91)</span>
            <input
              name="referrerPhone"
              required
              defaultValue="+919800001001"
              className="h-10 border border-ink/20 bg-paper px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Email (optional)</span>
            <input
              name="referrerEmail"
              type="email"
              defaultValue="asha@easyrefer.example"
              className="h-10 border border-ink/20 bg-paper px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">Notes (optional)</span>
          <textarea
            name="notes"
            rows={2}
            className="border border-ink/20 bg-paper px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
          />
        </label>
      </fieldset>

      <label className="flex items-start gap-3 border border-ink/15 bg-paper-2 px-4 py-3 text-sm">
        <input type="checkbox" name="consent" required className="mt-1" />
        <span>
          I confirm the owner consented to be contacted by Easy Rental about listing this property.
          Self-referral and scraped third-party owner lists are not allowed.
        </span>
      </label>

      <SubmitButton className="h-11 bg-brand font-semibold text-paper hover:bg-brand-deep">
        Submit indication
      </SubmitButton>
    </form>
  )
}
