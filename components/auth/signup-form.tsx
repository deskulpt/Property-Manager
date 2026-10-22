"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/submit-button"
import { signUpAction, type AuthFormState } from "@/lib/actions"

const initial: AuthFormState = { error: null, message: null, fieldErrors: {} }

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, initial)
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
    </form>
  )
}

/** @deprecated Prefer SignUpForm — alias for main import sites. */
export const SignupForm = SignUpForm
