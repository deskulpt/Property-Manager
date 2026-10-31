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
import { MARKET_COOKIE, MARKET_COOKIE_MAX_AGE, normalizeMarketIso } from "@/lib/markets/cookie"

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

function persistMarket(iso: string) {
  const value = normalizeMarketIso(iso)
  document.cookie = `${MARKET_COOKIE}=${encodeURIComponent(value)};path=/;max-age=${MARKET_COOKIE_MAX_AGE};samesite=lax`
  try {
    localStorage.setItem(MARKET_COOKIE, value)
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

  useEffect(() => {
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
    persistMarket(preferred)
  }, [allowed, initialMarket])

  const setMarket = useCallback(
    (iso: string) => {
      const next = normalizeMarketIso(iso)
      if (!allowed.has(next) && next !== "IN") return
      startTransition(() => {
        setMarketState(next)
        persistMarket(next)
        document.documentElement.dataset.market = next
      })
    },
    [allowed],
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

export function MarketFlagSwitch({ className = "" }: { className?: string }) {
  const { market, liveIsos, setMarket, pending } = useMarket()
  if (liveIsos.length < 2) {
    return (
      <span
        className={`font-mono text-[10px] uppercase tracking-wider text-ink-faint ${className}`}
        data-testid="market-flag-IN"
        title="Only India pack is live"
      >
        IN
      </span>
    )
  }
  return (
    <div className={`flex items-center gap-1 ${className}`} role="group" aria-label="Market">
      {liveIsos.map((iso) => (
        <button
          key={iso}
          type="button"
          data-testid={`market-flag-${iso}`}
          aria-pressed={market === iso}
          disabled={pending}
          onClick={() => setMarket(iso)}
          className={`px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
            market === iso
              ? "bg-brand text-paper"
              : "border border-brand/20 text-ink-soft hover:border-terra hover:text-terra"
          }`}
        >
          {iso}
        </button>
      ))}
    </div>
  )
}
