"use client"

import Link from "next/link"
import { useActionState } from "react"
import { loginWithPassword, type AuthFormState } from "@/lib/actions"
import { SubmitButton } from "@/components/submit-button"

const initial: AuthFormState = {}

export function LoginForm() {
  const [state, action] = useActionState(loginWithPassword, initial)

  return (
    <form action={action} className="grid gap-4">
      {state.error ? (
        <p className="border border-terra/40 bg-terra/10 px-3 py-2 text-sm text-ink">{state.error}</p>
      ) : null}
      <label className="grid gap-1 text-sm">
        <span className="font-medium text-ink">Email</span>
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
          autoComplete="current-password"
          className="h-10 border border-ink/20 bg-card px-3 outline-none focus-visible:ring-2 focus-visible:ring-terra/40"
        />
        {state.fieldErrors?.password ? (
          <span className="text-xs text-terra">{state.fieldErrors.password}</span>
        ) : null}
      </label>
      <SubmitButton className="h-11 bg-terra font-serif text-sm font-bold text-white hover:bg-terra-dark">
        Log in
      </SubmitButton>
      <p className="text-sm text-ink-soft">
        New landlord?{" "}
        <Link href="/signup" className="font-semibold text-terra hover:underline">
          Create an account
        </Link>
      </p>
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        Demo fixture users still use the Demo identity switcher (no password).
      </p>
    </form>
  )
}
