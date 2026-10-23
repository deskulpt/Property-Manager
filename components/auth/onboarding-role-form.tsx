"use client"

import { useActionState, useState } from "react"
import { completeOnboardingRole, type AuthFormState } from "@/lib/actions"
import { SubmitButton } from "@/components/submit-button"
import { ROLE_LEVEL_LABEL, type RoleLevel } from "@/lib/role-level"

const initial: AuthFormState = {}

const OPTIONS: { level: RoleLevel; blurb: string }[] = [
  {
    level: 2,
    blurb: "Own a landlord organisation — list properties after you purchase a plan.",
  },
  {
    level: 3,
    blurb: "Property manager collaborating on invited landlord portfolios.",
  },
  {
    level: 4,
    blurb: "Browse, apply, book visits, and manage your occupant portal.",
  },
  {
    level: 5,
    blurb: "Service provider desk for trade jobs in your catchment.",
  },
]

export function OnboardingRoleForm() {
  const [state, action] = useActionState(completeOnboardingRole, initial)
  const [level, setLevel] = useState<RoleLevel>(2)

  return (
    <form action={action} className="grid gap-5" data-testid="onboarding-role-form">
      {state.error ? (
        <p className="border border-terra/40 bg-terra/10 px-3 py-2 text-sm text-ink" role="alert">
          {state.error}
        </p>
      ) : null}
      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium text-ink">Select your role</legend>
        {OPTIONS.map((opt) => (
          <label
            key={opt.level}
            className={`flex cursor-pointer gap-3 border px-3 py-3 transition-colors ${
              level === opt.level
                ? "border-terra bg-terra/10"
                : "border-ink/15 bg-card hover:border-ink/30"
            }`}
          >
            <input
              type="radio"
              name="level"
              value={opt.level}
              checked={level === opt.level}
              onChange={() => setLevel(opt.level)}
              className="mt-1"
            />
            <span>
              <span className="block font-semibold text-ink">{ROLE_LEVEL_LABEL[opt.level]}</span>
              <span className="mt-0.5 block text-sm text-ink-soft">{opt.blurb}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {level === 2 || level === 3 ? (
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-ink">
            {level === 2 ? "Organisation / company" : "Desk or agency name"}
          </span>
          <input
            name="company"
            required={level === 2}
            autoComplete="organization"
            placeholder={level === 2 ? "e.g. North Ridge Parks" : "e.g. Kapoor Portfolio Desk"}
            className="h-10 border border-ink/20 bg-card px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
          />
          {state.fieldErrors?.company ? (
            <span className="text-xs text-terra">{state.fieldErrors.company}</span>
          ) : null}
        </label>
      ) : null}

      {level === 5 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Trade</span>
            <select
              name="trade"
              className="h-10 border border-ink/20 bg-card px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
              defaultValue="electrician"
            >
              <option value="electrician">Electrician</option>
              <option value="plumber">Plumber</option>
              <option value="courier">Courier</option>
              <option value="cleaning">Cleaning</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-medium text-ink">Service area</span>
            <input
              name="serviceArea"
              placeholder="e.g. Bhiwandi"
              className="h-10 border border-ink/20 bg-card px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
            />
          </label>
        </div>
      ) : null}

      <SubmitButton className="h-11 bg-brand font-serif text-sm font-bold text-paper hover:bg-brand-deep">
        Continue
      </SubmitButton>
    </form>
  )
}
