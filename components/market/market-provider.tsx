"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import {
  DEFAULT_MARKET_ID,
  getMarket,
  MARKET_COOKIE,
  MARKET_STORAGE_KEY,
  parseMarketId,
  type MarketId,
  type MarketProfile,
} from "@/lib/market"

type MarketContextValue = {
  marketId: MarketId
  market: MarketProfile
  setMarketId: (id: MarketId) => void
}

const MarketContext = createContext<MarketContextValue | null>(null)

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

function persistMarket(id: MarketId) {
  try {
    localStorage.setItem(MARKET_STORAGE_KEY, id)
  } catch {
    /* private mode */
  }
  document.cookie = `${MARKET_COOKIE}=${id};path=/;max-age=${COOKIE_MAX_AGE};samesite=lax`
}

function readStoredMarket(): MarketId | null {
  try {
    const fromLs = localStorage.getItem(MARKET_STORAGE_KEY)
    if (fromLs) return parseMarketId(fromLs)
  } catch {
    /* ignore */
  }
  const match = document.cookie.match(/(?:^|;\s*)market=(IN|CA)(?:;|$)/)
  if (match?.[1]) return parseMarketId(match[1])
  return null
}

export function MarketProvider({
  initialMarketId = DEFAULT_MARKET_ID,
  children,
}: {
  initialMarketId?: MarketId
  children: ReactNode
}) {
  const router = useRouter()
  const [marketId, setMarketIdState] = useState<MarketId>(initialMarketId)

  useEffect(() => {
    const stored = readStoredMarket()
    if (stored && stored !== marketId) {
      setMarketIdState(stored)
      persistMarket(stored)
    } else {
      persistMarket(marketId)
    }
    // Sync once on mount from localStorage / cookie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setMarketId = useCallback(
    (id: MarketId) => {
      setMarketIdState(id)
      persistMarket(id)
      router.refresh()
    },
    [router],
  )

  const value = useMemo(
    () => ({
      marketId,
      market: getMarket(marketId),
      setMarketId,
    }),
    [marketId, setMarketId],
  )

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}

export function useMarket() {
  const ctx = useContext(MarketContext)
  if (!ctx) {
    return {
      marketId: DEFAULT_MARKET_ID as MarketId,
      market: getMarket(DEFAULT_MARKET_ID),
      setMarketId: (_id: MarketId) => {},
    }
  }
  return ctx
}
