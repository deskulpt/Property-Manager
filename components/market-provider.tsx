"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import { MARKET_COOKIE, MARKET_COOKIE_MAX_AGE, normalizeMarketIso } from "@/lib/markets/cookie"
import {
  COUNTRY_CONSENT_COOKIE,
  COUNTRY_CONSENT_MAX_AGE,
  countryPrefixedPath,
  isoForPathSegment,
  pathSegmentForIso,
  stripCountryPrefix,
} from "@/lib/markets/path-segments"

type MarketContextValue = {
  market: string
  liveIsos: string[]
  setMarket: (iso: string) => void
  pending: boolean
}

const MarketContext = createContext<MarketContextValue | null>(null)

function readCookieMarket(): string {
  if (typeof document === "undefined") return "IN"
  const match = document.cookie.match(new RegExp(`(?:^|; )${MARKET_COOKIE}=([^;]*)`))
  return normalizeMarketIso(match?.[1] ? decodeURIComponent(match[1]) : "IN")
}

function persistMarket(iso: string, consent = true) {
  const value = normalizeMarketIso(iso)
  document.cookie = `${MARKET_COOKIE}=${encodeURIComponent(value)};path=/;max-age=${MARKET_COOKIE_MAX_AGE};samesite=lax`
  if (consent) {
    document.cookie = `${COUNTRY_CONSENT_COOKIE}=${encodeURIComponent(value)};path=/;max-age=${COUNTRY_CONSENT_MAX_AGE};samesite=lax`
  }
  try {
    localStorage.setItem(MARKET_COOKIE, value)
    if (consent) localStorage.setItem(COUNTRY_CONSENT_COOKIE, value)
  } catch {
    /* private mode */
  }
  return value
}

export function MarketProvider({
  initialMarket = "IN",
  liveIsos = ["IN"],
  children,
}: {
  initialMarket?: string
  liveIsos?: string[]
  children: React.ReactNode
}) {
  const [market, setMarketState] = useState(() => normalizeMarketIso(initialMarket))
  const [pending, startTransition] = useTransition()
  const allowed = useMemo(() => new Set(liveIsos.map((i) => i.toUpperCase())), [liveIsos])
  const pathname = usePathname() || "/"
  const router = useRouter()

  useEffect(() => {
    const fromPath = stripCountryPrefix(pathname)
    if (fromPath) {
      const iso = normalizeMarketIso(fromPath.iso)
      setMarketState(iso)
      persistMarket(iso, true)
      return
    }
    const fromCookie = readCookieMarket()
    let fromStorage = "IN"
    try {
      fromStorage = normalizeMarketIso(localStorage.getItem(MARKET_COOKIE))
    } catch {
      fromStorage = fromCookie
    }
    const preferred = allowed.has(fromCookie)
      ? fromCookie
      : allowed.has(fromStorage)
        ? fromStorage
        : normalizeMarketIso(initialMarket)
    setMarketState(preferred)
    // Do not invent consent on root picker — only persist market preference.
    persistMarket(preferred, pathname !== "/")
  }, [allowed, initialMarket, pathname])

  const setMarket = useCallback(
    (iso: string) => {
      const next = normalizeMarketIso(iso)
      if (!allowed.has(next) && next !== "IN") return
      startTransition(() => {
        setMarketState(next)
        persistMarket(next, true)
        document.documentElement.dataset.market = next
        const stripped = stripCountryPrefix(pathname)
        const internal = stripped?.path ?? (pathname === "/" ? "/" : pathname)
        const first = pathname.split("/")[1] ?? ""
        // Root picker stays; elsewhere navigate to the country-prefixed path.
        if (pathname === "/" || (first && isoForPathSegment(first) == null && first.length === 2)) {
          return
        }
        router.push(countryPrefixedPath(next, internal === "/" ? "/" : internal))
      })
    },
    [allowed, pathname, router],
  )

  useEffect(() => {
    document.documentElement.dataset.market = market
  }, [market])

  const value = useMemo(
    () => ({ market, liveIsos: [...allowed], setMarket, pending }),
    [market, allowed, setMarket, pending],
  )

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}

export function useMarket() {
  const ctx = useContext(MarketContext)
  if (!ctx) {
    return {
      market: "IN",
      liveIsos: ["IN"],
      setMarket: () => undefined,
      pending: false,
    } satisfies MarketContextValue
  }
  return ctx
}

/** Header switch — navigates `/in` ↔ `/ca` when pack is live. */
const SWITCHER_HINTS: { iso: string; label: string; hint: string }[] = [
  { iso: "IN", label: "🇮🇳 IN", hint: `Live — /${pathSegmentForIso("IN")} · INR · GST 18%` },
  {
    iso: "CA",
    label: "🇨🇦 CA",
    hint: `Parked until promote — then /${pathSegmentForIso("CA")} · CAD · HST gated`,
  },
]

export function MarketFlagSwitch({ className = "" }: { className?: string }) {
  const { market, liveIsos, setMarket, pending } = useMarket()
  const live = new Set(liveIsos.map((i) => i.toUpperCase()))

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-sm border border-ink/15 bg-paper/80 p-0.5 ${className}`}
      role="group"
      aria-label="Market"
      data-testid="market-flag-switch"
    >
      {SWITCHER_HINTS.map((opt) => {
        const isLive = live.has(opt.iso)
        const selected = market === opt.iso && isLive
        return (
          <button
            key={opt.iso}
            type="button"
            data-testid={`market-flag-${opt.iso}`}
            data-market-status={isLive ? "live" : "parked"}
            title={opt.hint}
            aria-pressed={selected}
            aria-disabled={!isLive}
            disabled={!isLive || pending}
            onClick={() => {
              if (isLive) setMarket(opt.iso)
            }}
            className={
              isLive
                ? selected
                  ? "rounded-sm bg-brand px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-paper"
                  : "rounded-sm px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-soft hover:bg-paper-2 hover:text-brand"
                : "cursor-not-allowed rounded-sm px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-faint opacity-70"
            }
          >
            {opt.label}
            {!isLive ? (
              <span className="ml-1 font-sans text-[9px] normal-case tracking-normal">parked</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
