"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MARKET_COOKIE, MARKET_COOKIE_MAX_AGE, normalizeMarketIso } from "@/lib/markets/cookie"
import {
  COUNTRY_CONSENT_COOKIE,
  COUNTRY_CONSENT_MAX_AGE,
  countryPrefixedPath,
  pathSegmentForIso,
} from "@/lib/markets/path-segments"

export type CountryPickerOption = {
  iso: string
  name: string
  currency: string
  pathSegment: string
  status: "live" | "draft" | "ready"
  blurb: string
}

function persistConsent(iso: string) {
  const value = normalizeMarketIso(iso)
  document.cookie = `${MARKET_COOKIE}=${encodeURIComponent(value)};path=/;max-age=${MARKET_COOKIE_MAX_AGE};samesite=lax`
  document.cookie = `${COUNTRY_CONSENT_COOKIE}=${encodeURIComponent(value)};path=/;max-age=${COUNTRY_CONSENT_MAX_AGE};samesite=lax`
  try {
    localStorage.setItem(MARKET_COOKIE, value)
    localStorage.setItem(COUNTRY_CONSENT_COOKIE, value)
  } catch {
    /* private mode */
  }
  document.documentElement.dataset.market = value
}

export function CountryPicker({
  options,
  suggestedIso,
  nextPath = "/",
}: {
  options: CountryPickerOption[]
  suggestedIso?: string | null
  nextPath?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [picked, setPicked] = useState<string | null>(null)

  const suggest = useMemo(() => {
    if (!suggestedIso) return null
    const iso = normalizeMarketIso(suggestedIso)
    return options.find((o) => o.iso === iso) ?? null
  }, [options, suggestedIso])

  const safeNext = useMemo(() => {
    if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) return "/"
    // Avoid nesting country prefixes in next.
    const parts = nextPath.split("/")
    if (parts[1] && options.some((o) => o.pathSegment === parts[1].toLowerCase())) {
      const rest = "/" + parts.slice(2).join("/")
      return rest === "/" ? "/" : rest
    }
    return nextPath
  }, [nextPath, options])

  function choose(iso: string) {
    setPicked(iso)
    startTransition(() => {
      persistConsent(iso)
      const target = countryPrefixedPath(iso, safeNext)
      router.replace(target)
    })
  }

  return (
    <main
      className="relative flex flex-1 flex-col overflow-hidden bg-[radial-gradient(120%_80%_at_10%_0%,#0e6e8c22,transparent_55%),radial-gradient(90%_70%_at_90%_10%,#8f6f1f18,transparent_50%),linear-gradient(165deg,#f3f6f8_0%,#e7eef2_45%,#dfe8ee_100%)]"
      data-testid="country-picker"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(to_right,#13253a0d_1px,transparent_1px),linear-gradient(to_bottom,#13253a0d_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-16 sm:px-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#0e6e8c]">Easy Rental</p>
        <h1 className="mt-3 max-w-xl font-serif text-4xl font-semibold leading-tight text-[#13253a] sm:text-5xl">
          Choose your country
        </h1>
        <p className="mt-4 max-w-xl text-base text-[#13253a]/cc">
          Sites are split by country pack — currency, tax, payments, and legal copy follow your choice.
          We never auto-redirect from geo without your consent.
        </p>

        {suggest ? (
          <p
            className="mt-6 border-l-2 border-[#0e6e8c] bg-[#0e6e8c0f] px-4 py-3 text-sm text-[#13253a]"
            data-testid="country-geo-suggest"
          >
            Suggested from your locale: <strong>{suggest.name}</strong> (`/{suggest.pathSegment}`).
            Confirm below — suggestion only.
          </p>
        ) : null}

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {options.map((opt) => {
            const selected = picked === opt.iso
            const isSuggest = suggest?.iso === opt.iso
            return (
              <li key={opt.iso}>
                <button
                  type="button"
                  data-testid={`country-pick-${opt.iso}`}
                  data-country-status={opt.status}
                  disabled={pending || opt.status !== "live"}
                  onClick={() => {
                    if (opt.status === "live") choose(opt.iso)
                  }}
                  className={`group w-full border px-5 py-5 text-left transition ${
                    opt.status === "live"
                      ? selected
                        ? "border-[#13253a] bg-[#13253a] text-[#f3f6f8]"
                        : "border-[#13253a]/20 bg-white/70 hover:border-[#0e6e8c] hover:bg-white"
                      : "cursor-not-allowed border-[#13253a]/10 bg-white/40 opacity-70"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-serif text-2xl font-semibold tracking-tight">
                      {opt.name}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider opacity-80">
                      /{pathSegmentForIso(opt.iso)}
                    </span>
                  </span>
                  <span
                    className={`mt-2 block text-sm ${selected ? "text-[#f3f6f8]/cc" : "text-[#13253a]/bb"}`}
                  >
                    {opt.currency} · {opt.blurb}
                  </span>
                  {opt.status !== "live" ? (
                    <span className="mt-3 inline-block font-mono text-[10px] uppercase tracking-wider text-[#8f6f1f]">
                      Parked — promote CountryPack to open
                    </span>
                  ) : isSuggest ? (
                    <span className="mt-3 inline-block font-mono text-[10px] uppercase tracking-wider text-[#0e6e8c]">
                      Suggested
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
