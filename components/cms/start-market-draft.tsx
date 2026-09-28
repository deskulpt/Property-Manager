"use client"

import { useActionState } from "react"
import { submitCreateMarketDraft, type MarketFormState } from "@/lib/actions"

const initial: MarketFormState = { error: null, ok: false }

export function StartMarketDraftForm({
  labels,
}: {
  labels: { iso: string; name: string; submit: string }
}) {
  const [state, action] = useActionState(submitCreateMarketDraft, initial)
  return (
    <form action={action} className="grid gap-3 md:grid-cols-[8rem_1fr_auto]">
      <label className="grid gap-1 text-sm">
        {labels.iso}
        <input
          name="isoCode"
          maxLength={2}
          placeholder="AE"
          className="h-9 border border-input bg-background px-2 uppercase"
          required
        />
      </label>
      <label className="grid gap-1 text-sm">
        {labels.name}
        <input
          name="name"
          placeholder="United Arab Emirates"
          className="h-9 border border-input bg-background px-2"
          required
        />
      </label>
      <div className="flex items-end">
        <button type="submit" className="h-9 bg-brand px-4 font-sans text-sm font-bold text-paper">
          {labels.submit}
        </button>
      </div>
      {state.error ? <p className="text-sm text-destructive md:col-span-3">{state.error}</p> : null}
    </form>
  )
}
