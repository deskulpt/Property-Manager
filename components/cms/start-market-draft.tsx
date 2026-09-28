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
    <form action={action} className="grid gap-3 md:grid-cols-[8rem_1fr_auto]" data-testid="start-market-draft">
      <label className="grid gap-1 text-sm">
        {labels.iso}
        <input
          id="market-iso"
          data-testid="market-iso"
          name="isoCode"
          maxLength={2}
          autoComplete="off"
          defaultValue=""
          className="h-9 border border-input bg-background px-2 uppercase"
          required
        />
      </label>
      <label className="grid gap-1 text-sm">
        {labels.name}
        <input
          id="market-name"
          data-testid="market-name"
          name="name"
          autoComplete="off"
          defaultValue=""
          className="h-9 border border-input bg-background px-2"
          required
        />
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          data-testid="market-start-submit"
          className="h-9 bg-brand px-4 font-sans text-sm font-bold text-paper"
        >
          {labels.submit}
        </button>
      </div>
      {state.error ? (
        <p className="text-sm text-destructive md:col-span-3" data-testid="market-start-error">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
