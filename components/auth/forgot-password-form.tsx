"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/submit-button"
import { forgotPasswordAction, type AuthFormState } from "@/lib/actions"

const initial: AuthFormState = { error: null, message: null, fieldErrors: {} }

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, initial)
  return (
    <form action={action} className="grid gap-4" data-testid="forgot-password-form">
      <div className="grid gap-2">
        <Label htmlFor="email">Account email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.message ? <p className="text-sm text-ink-soft">{state.message}</p> : null}
      <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
    </form>
  )
}
