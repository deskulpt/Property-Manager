"use client"

import { useActionState } from "react"
import { submitAddLanguage, type LanguageFormState } from "@/lib/actions"

const initial: LanguageFormState = { error: null, message: null }

export function AddLanguageForm({
  labels,
  keyConfigured,
}: {
  labels: { code: string; name: string; submit: string; noKeyHint: string }
  keyConfigured: boolean
}) {
  const [state, action] = useActionState(submitAddLanguage, initial)
  return (
    <div className="grid gap-3">
      {!keyConfigured ? (
        <p className="border border-terra/40 bg-terra/10 px-3 py-2 text-sm" data-testid="translation-waiting-hint">
          {labels.noKeyHint}
        </p>
      ) : null}
      <form action={action} className="grid gap-3 md:grid-cols-[8rem_1fr_auto]">
        <label className="grid gap-1 text-sm">
          {labels.code}
          <input
            name="code"
            placeholder="hi"
            className="h-9 border border-input bg-background px-2"
            required
          />
        </label>
        <label className="grid gap-1 text-sm">
          {labels.name}
          <input
            name="name"
            placeholder="Hindi"
            className="h-9 border border-input bg-background px-2"
            required
          />
        </label>
        <div className="flex items-end">
          <button type="submit" className="h-9 bg-brand px-4 font-sans text-sm font-bold text-paper">
            {labels.submit}
          </button>
        </div>
      </form>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.message ? (
        <p className="border border-avail/40 bg-avail/10 px-3 py-2 text-sm font-bold text-avail" role="status" data-testid="language-status">
          {state.message}
        </p>
      ) : null}
    </div>
  )
}
