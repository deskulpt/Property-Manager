"use client"

import { SubmitButton } from "@/components/submit-button"
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
  return (
    <form action={submitDisplayCurrency} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="displayCurrency">Display currency</Label>
        <select
          id="displayCurrency"
          name="displayCurrency"
          defaultValue={current}
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
        <SubmitButton pendingLabel="Saving…">Save display preference</SubmitButton>
      </div>
    </form>
  )
}
