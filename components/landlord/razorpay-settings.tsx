"use client"

import { useActionState } from "react"
import { saveRazorpaySettingsAction, type ShopActionState } from "@/lib/actions"
import type { ShopSettingsPublic } from "@/lib/db"
import { SubmitButton } from "@/components/submit-button"

const initial: ShopActionState = { error: null, message: null }

export function RazorpaySettings({ settings }: { settings: ShopSettingsPublic }) {
  const [state, action] = useActionState(saveRazorpaySettingsAction, initial)

  return (
    <div>
      <h2 className="font-sans text-lg font-extrabold">Payments · Razorpay (shop)</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Key Secret is write-only: paste to set or rotate; GET responses never include the raw secret.
        Demo mode forces the local demo adapter even when keys exist. This build never places live
        Razorpay charges.
      </p>
      <form action={action} className="mt-4 grid max-w-xl gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={settings.enabled} />
          <span>Shop enabled for occupants</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="demoMode" defaultChecked={settings.demoMode} />
          <span>Demo mode (recommended until go-live)</span>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Key ID</span>
          <input
            name="keyId"
            defaultValue={settings.keyId ?? ""}
            placeholder="rzp_test_…"
            autoComplete="off"
            className="h-10 border border-ink/20 bg-card px-3 font-mono text-sm"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Key Secret</span>
          <input
            name="keySecret"
            type="password"
            placeholder={
              settings.hasSecret
                ? `Leave blank to keep ${settings.secretLast4 ?? "••••"}`
                : "Paste secret — never shown again"
            }
            autoComplete="new-password"
            className="h-10 border border-ink/20 bg-card px-3 font-mono text-sm"
          />
          {settings.hasSecret ? (
            <span className="text-xs text-ink-faint">
              Secret on file: {settings.secretLast4}. Blank submit keeps the current secret.
            </span>
          ) : (
            <span className="text-xs text-ink-faint">No secret stored yet.</span>
          )}
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Razorpay mode</span>
          <select
            name="razorpayMode"
            defaultValue={settings.razorpayMode}
            className="h-10 border border-ink/20 bg-card px-3"
          >
            <option value="test">Test</option>
            <option value="live">Live</option>
          </select>
        </label>
        <SubmitButton className="h-10 w-fit bg-brand px-4 text-sm font-semibold text-paper">
          Save payment settings
        </SubmitButton>
      </form>
      {state.error ? <p className="mt-3 text-sm text-destructive">{state.error}</p> : null}
      {state.message ? (
        <p className="mt-3 border border-avail/40 bg-avail/10 px-3 py-2 text-sm" role="status">
          {state.message}
        </p>
      ) : null}
    </div>
  )
}
