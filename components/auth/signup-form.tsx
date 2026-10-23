"use client"

import Link from "next/link"
import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/submit-button"
import { signUpAction, signupAccount, type AuthFormState } from "@/lib/actions"

const initialAccount: AuthFormState = {}
const initialSlice: AuthFormState = { error: null, message: null, fieldErrors: {} }

/** Main path: credentials → /onboarding/role → (L2) /pricing/subscribe. */
export function SignupForm() {
  const [state, action] = useActionState(signupAccount, initialAccount)

  return (
    <form action={action} className="grid gap-4" data-testid="signup-form">
      {state.error ? (
        <p className="border border-terra/40 bg-terra/10 px-3 py-2 text-sm text-ink" role="alert">
          {state.error}
        </p>
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
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" name="consent" className="mt-1" required />
        <span>
          I agree to the{" "}
          <Link href="/legal/privacy" className="font-semibold text-terra hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/legal/terms" className="font-semibold text-terra hover:underline">
            Terms
          </Link>
          . Easy Rental will process my account data for the desk I choose next (DPDP notice).
        </span>
      </label>
      {state.fieldErrors?.consent ? (
        <span className="text-xs text-terra">{state.fieldErrors.consent}</span>
      ) : null}
      <p className="text-sm text-ink-soft">
        Next you pick a role (landlord, property manager, applicant, or service provider). Landlords
        then activate a plan at{" "}
        <Link href="/pricing" className="font-semibold text-terra hover:underline">
          Pricing
        </Link>
        .
      </p>
      <SubmitButton className="h-11 bg-brand font-serif text-sm font-bold text-paper hover:bg-brand-deep">
        Create account
      </SubmitButton>
      <p className="text-sm text-ink-soft">
        Prefer India org self-serve (seats + package)?{" "}
        <Link href="/signup?flow=org" className="font-semibold text-terra hover:underline">
          Create landlord organisation
        </Link>
      </p>
    </form>
  )
}

/** Slice A path: credentials → /create-account (India org + owner seat). */
export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, initialSlice)
  return (
    <form action={action} className="grid gap-4" data-testid="signup-form">
      <div className="grid gap-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" autoComplete="name" required />
        {state.fieldErrors?.name ? (
          <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {state.fieldErrors?.email ? (
          <p className="text-sm text-destructive">{state.fieldErrors.email}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        {state.fieldErrors?.password ? (
          <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
        ) : null}
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton pendingLabel="Creating…">Sign up</SubmitButton>
      <p className="text-sm text-ink-soft">
        Or use{" "}
        <Link href="/signup" className="font-semibold text-terra hover:underline">
          role + subscribe onboarding
        </Link>
        .
      </p>
    </form>
  )
}
