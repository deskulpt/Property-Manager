"use client"

import { useEffect, useMemo, useState } from "react"
import { useMarket } from "@/components/market/market-provider"
import {
  AMENITY_OPTIONS,
  estimateRent,
  formatEstimateMoney,
  type AmenityKey,
} from "@/lib/rent-estimate"

export function RentEstimateCalculator({
  initialSqft = 10000,
  initialPin,
}: {
  initialSqft?: number
  initialPin?: string
}) {
  const { market, marketId } = useMarket()
  const defaultPin = marketId === "CA" ? "M5V 2T6" : "421302"
  const [sqft, setSqft] = useState(String(initialSqft))
  const [pin, setPin] = useState(initialPin || defaultPin)
  const [amenities, setAmenities] = useState<AmenityKey[]>(["dock", "power_3ph"])

  useEffect(() => {
    if (!initialPin) setPin(marketId === "CA" ? "M5V 2T6" : "421302")
  }, [marketId, initialPin])

  const result = useMemo(
    () =>
      estimateRent({
        sqft: Number(sqft),
        pin,
        amenities,
        marketId,
      }),
    [sqft, pin, amenities, marketId],
  )

  function toggleAmenity(key: AmenityKey) {
    setAmenities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  function onPinChange(raw: string) {
    if (marketId === "CA") {
      const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
      const formatted =
        compact.length > 3 ? `${compact.slice(0, 3)} ${compact.slice(3)}` : compact
      setPin(formatted)
      return
    }
    setPin(raw.replace(/\D/g, "").slice(0, 6))
  }

  const currencyLabel = market.currency

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        className="grid gap-5 border border-ink/15 bg-paper-2 p-5 md:p-6"
        onSubmit={(e) => e.preventDefault()}
      >
        <h2 className="font-serif text-xl font-semibold">Inputs</h2>
        {marketId === "CA" ? (
          <p className="border border-brand/25 bg-accent/40 px-3 py-2 text-xs leading-relaxed text-ink-soft">
            {market.commercialCallout}
          </p>
        ) : null}
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Area (SF)</span>
          <input
            type="number"
            min={500}
            max={500000}
            value={sqft}
            onChange={(e) => setSqft(e.target.value)}
            className="h-10 border border-ink/20 bg-card px-3"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{market.pinLabel}</span>
          <input
            type="text"
            inputMode={marketId === "CA" ? "text" : "numeric"}
            maxLength={marketId === "CA" ? 7 : 6}
            value={pin}
            onChange={(e) => onPinChange(e.target.value)}
            placeholder={market.pinPlaceholder}
            className="h-10 border border-ink/20 bg-card px-3 font-mono"
            data-testid="rent-estimate-pin"
          />
          <span className="text-xs text-ink-soft">{market.pinHint}</span>
        </label>
        <fieldset>
          <legend className="text-sm font-medium">Amenities</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {AMENITY_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className="flex cursor-pointer items-start gap-2 border border-ink/10 bg-card px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={amenities.includes(opt.key)}
                  onChange={() => toggleAmenity(opt.key)}
                  className="mt-1"
                />
                <span>
                  {opt.label}
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                    +{opt.upliftPct}%
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </form>

      <div className="border border-ink/15 bg-brand p-5 text-paper md:p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#9ed0e0]">
          Rough monthly range · {currencyLabel}
        </p>
        <p className="mt-1 text-[11px] text-paper/60">{market.currencyLedgerNote}</p>
        {"error" in result ? (
          <p className="mt-4 text-sm text-[#f0c9b8]" role="alert">
            {result.error}
          </p>
        ) : (
          <>
            <p className="mt-3 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              {formatEstimateMoney(result.monthlyLow, marketId)} –{" "}
              {formatEstimateMoney(result.monthlyHigh, marketId)}
            </p>
            <p className="mt-2 text-sm text-paper/75">
              Mid {formatEstimateMoney(result.monthlyMid, marketId)} / mo · ~
              {formatEstimateMoney(result.annualMid, marketId)} / yr
            </p>
            <dl className="mt-6 grid gap-2 font-mono text-[11px] uppercase tracking-wider text-paper/65">
              <div className="flex justify-between gap-3">
                <dt>Corridor</dt>
                <dd className="text-paper">{result.corridorLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Base rate</dt>
                <dd className="text-paper">
                  {marketId === "CA" ? "CA$" : "₹"}
                  {result.baseRatePsf} / SF
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Adjusted</dt>
                <dd className="text-paper">
                  {marketId === "CA" ? "CA$" : "₹"}
                  {result.adjustedRatePsf} / SF (+{result.upliftPct}%)
                </dd>
              </div>
            </dl>
            <p
              className="mt-6 border border-white/20 bg-white/5 px-3 py-2 text-xs leading-relaxed text-paper/85"
              role="note"
            >
              {result.disclaimer}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
