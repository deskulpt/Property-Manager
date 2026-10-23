"use client"

import Link from "next/link"
import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/submit-button"
import { logInAction, type AuthFormState } from "@/lib/actions"

const initial: AuthFormState = { error: null, message: null, fieldErrors: {} }

export function LoginForm() {
  const [state, action] = useActionState(logInAction, initial)
  return (
    <form action={action} className="grid gap-4" data-testid="login-form">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
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
          autoComplete="current-password"
          required
        />
        {state.fieldErrors?.password ? (
          <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
        ) : null}
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton pendingLabel="Signing in…">Log in</SubmitButton>
      <p className="text-sm text-ink-soft">
        New landlord?{" "}
        <Link href="/signup" className="font-semibold text-terra hover:underline">
          Create an account
        </Link>
      </p>
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        Platform staff (L0/L1) use password login. Impersonation is on the sticky bar after staff
        sign-in.
      </p>
    </form>
  )
}
