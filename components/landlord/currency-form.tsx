"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Label } from "@/components/ui/label"
import { submitDisplayCurrency } from "@/lib/actions"
import { DEMO_FX_AS_OF, DEMO_FX_PER_INR, type DisplayCurrency } from "@/lib/market"

const OPTIONS: { value: DisplayCurrency; label: string }[] = [
  { value: "INR", label: "INR — Indian rupee (ledger currency)" },
  { value: "USD", label: "USD — US dollar (display only)" },
  { value: "CAD", label: "CAD — Canadian dollar (display only)" },
  { value: "GBP", label: "GBP — British pound (display only)" },
]

export function CurrencyForm({ current }: { current: DisplayCurrency }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const data = new FormData(form)
        setStatus(null)
        setError(null)
        startTransition(async () => {
          const result = await submitDisplayCurrency(data)
          if (!result.ok) {
            setError(result.error)
            return
          }
          setStatus(`Saved. Display currency is now ${result.currency}. Ledger charge currency stays INR.`)
          router.refresh()
        })
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="displayCurrency">Display currency</Label>
        <select
          id="displayCurrency"
          name="displayCurrency"
          defaultValue={current}
          key={current}
          className="h-9 w-full max-w-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div className="border border-border bg-paper-2 px-4 py-3 text-sm">
        <p className="font-mono text-[10px] uppercase tracking-wider text-terra">Demo FX table · not a live rate</p>
        <p className="mt-1 text-ink-soft">As of {DEMO_FX_AS_OF}. Source of truth for rent, GST, late fees, UPI, and eNACH stays INR.</p>
        <ul className="mt-2 grid gap-1 font-mono text-xs sm:grid-cols-2">
          {(Object.keys(DEMO_FX_PER_INR) as DisplayCurrency[]).map((code) => (
            <li key={code}>
              1 INR → {DEMO_FX_PER_INR[code]} {code}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <button
          type="submit"
          disabled={pending}
          data-testid="save-display-currency"
          className="h-9 bg-brand px-4 font-sans text-sm font-bold text-paper disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save display preference"}
        </button>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert" data-testid="currency-error">
          {error}
        </p>
      ) : null}
      {status ? (
        <p className="border border-avail/40 bg-avail/10 px-3 py-2 text-sm font-bold text-avail" role="status" data-testid="currency-saved">
          {status}
        </p>
      ) : null}
    </form>
  )
}
