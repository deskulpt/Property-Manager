"use client"

import Link from "next/link"
import { useActionState } from "react"
import { signupLandlord, type AuthFormState } from "@/lib/actions"
import { SubmitButton } from "@/components/submit-button"

const initial: AuthFormState = {}

export function SignupForm() {
  const [state, action] = useActionState(signupLandlord, initial)

  return (
    <form action={action} className="grid gap-4">
      {state.error ? (
        <p className="border border-terra/40 bg-terra/10 px-3 py-2 text-sm text-ink">{state.error}</p>
      ) : null}
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-ink">Your name</span>
        <input
          name="name"
          required
          autoComplete="name"
          className="h-10 border border-ink/20 bg-card px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
        />
        {state.fieldErrors?.name ? (
          <span className="text-xs text-terra">{state.fieldErrors.name}</span>
        ) : null}
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-ink">Work email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-10 border border-ink/20 bg-card px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
        />
        {state.fieldErrors?.email ? (
          <span className="text-xs text-terra">{state.fieldErrors.email}</span>
        ) : null}
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-ink">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-10 border border-ink/20 bg-card px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
        />
        {state.fieldErrors?.password ? (
          <span className="text-xs text-terra">{state.fieldErrors.password}</span>
        ) : null}
        <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          Stored with bcrypt — never plaintext
        </span>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-ink">Organisation / company</span>
        <input
          name="company"
          required
          autoComplete="organization"
          placeholder="e.g. North Ridge Parks"
          className="h-10 border border-ink/20 bg-card px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
        />
        {state.fieldErrors?.company ? (
          <span className="text-xs text-terra">{state.fieldErrors.company}</span>
        ) : null}
      </label>
      <p className="text-sm text-ink-soft">
        Creates a landlord organisation on the Starter package (India). Upgrade to PRO later for a
        custom listings domain.
      </p>
      <SubmitButton className="h-11 bg-terra font-serif text-sm font-bold text-white hover:bg-terra-dark">
        Create account
      </SubmitButton>
      <p className="text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-terra hover:underline">
          Log in
        </Link>
      </p>
    </form>
  )
}
