"use client"

import { useMemo, useState } from "react"
import {
  AMENITY_OPTIONS,
  estimateRent,
  formatInr,
  type AmenityKey,
} from "@/lib/rent-estimate"

export function RentEstimateCalculator({
  initialSqft = 10000,
  initialPin = "421302",
}: {
  initialSqft?: number
  initialPin?: string
}) {
  const [sqft, setSqft] = useState(String(initialSqft))
  const [pin, setPin] = useState(initialPin)
  const [amenities, setAmenities] = useState<AmenityKey[]>(["dock", "power_3ph"])

  const result = useMemo(
    () =>
      estimateRent({
        sqft: Number(sqft),
        pin,
        amenities,
      }),
    [sqft, pin, amenities],
  )

  function toggleAmenity(key: AmenityKey) {
    setAmenities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <form
        className="grid gap-5 border border-ink/15 bg-paper-2 p-5 md:p-6"
        onSubmit={(e) => e.preventDefault()}
      >
        <h2 className="font-serif text-xl font-semibold">Inputs</h2>
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
          <span className="font-medium">Area PIN code</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="421302"
            className="h-10 border border-ink/20 bg-card px-3 font-mono"
          />
          <span className="text-xs text-ink-soft">
            First 3 digits map to a demo corridor rate (INR / SF / month).
          </span>
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
          Rough monthly range · INR
        </p>
        {"error" in result ? (
          <p className="mt-4 text-sm text-[#f0c9b8]" role="alert">
            {result.error}
          </p>
        ) : (
          <>
            <p className="mt-3 font-serif text-3xl font-semibold tracking-tight md:text-4xl">
              {formatInr(result.monthlyLowInr)} – {formatInr(result.monthlyHighInr)}
            </p>
            <p className="mt-2 text-sm text-paper/75">
              Mid {formatInr(result.monthlyMidInr)} / mo · ~{formatInr(result.annualMidInr)} / yr
            </p>
            <dl className="mt-6 grid gap-2 font-mono text-[11px] uppercase tracking-wider text-paper/65">
              <div className="flex justify-between gap-3">
                <dt>Corridor</dt>
                <dd className="text-paper">{result.corridorLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Base rate</dt>
                <dd className="text-paper">₹{result.baseRatePsf} / SF</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Adjusted</dt>
                <dd className="text-paper">
                  ₹{result.adjustedRatePsf} / SF (+{result.upliftPct}%)
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
