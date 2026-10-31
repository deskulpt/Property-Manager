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
    <form
      action={action}
      className="grid gap-3 md:grid-cols-[8rem_1fr_auto]"
      data-testid="start-market-draft"
    >
      <label className="grid gap-1 text-sm">
        {labels.iso}
        <input
          id="market-iso"
          data-testid="market-iso"
          name="isoCode"
          maxLength={2}
          autoComplete="off"
          defaultValue=""
          className="input input-bordered input-sm rounded-sm uppercase"
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
          className="input input-bordered input-sm rounded-sm"
          required
        />
      </label>
      <div className="flex items-end">
        <button
          type="submit"
          data-testid="market-start-submit"
          className="btn btn-primary btn-sm rounded-sm h-9"
        >
          {labels.submit}
        </button>
      </div>
      <label className="flex items-start gap-2 text-xs text-ink-soft md:col-span-3">
        <input
          type="checkbox"
          name="allowParked"
          value="1"
          className="checkbox checkbox-sm mt-0.5 rounded-sm"
          data-testid="market-allow-parked"
        />
        <span>
          Allow parked ISO (CA / US / BR / GB) — starts a <strong>checklist draft only</strong>. Complete ≠
          live CountryPack; header CA stays parked until promote.
        </span>
      </label>
      {state.error ? (
        <p className="text-sm text-error md:col-span-3" data-testid="market-start-error">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
