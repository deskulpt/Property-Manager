import { moneyPair, type DisplayCurrency } from "@/lib/market"

export function MoneyPair({
  inrMinor,
  display = "INR",
  className = "",
}: {
  inrMinor: number
  display?: DisplayCurrency
  className?: string
}) {
  const pair = moneyPair(inrMinor, display)
  return (
    <span className={className}>
      <span className="font-bold tabular-nums">{pair.primary}</span>
      {pair.secondary ? (
        <span className="mt-0.5 block font-mono text-[10px] font-normal uppercase tracking-wider text-ink-faint">
          Charge {pair.secondary} · INR
        </span>
      ) : null}
    </span>
  )
}
