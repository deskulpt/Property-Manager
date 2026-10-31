/**
 * Country / market registry — docs/country-schema-switch.md
 * IN is the only live MarketProfile until CountryPack promote lands.
 * CA (and US/BR/GB) stay parked — header may show the flag but must not switch schema.
 */

import { PARKED_MARKET_ISOS, LIVE_MARKET } from "@/lib/market-checklist"
import type { MarketId, MarketProfile } from "@/lib/market"
import { MARKETS } from "@/lib/market"

export type MarketSwitchOption = {
  iso: string
  name: string
  /** Live = business schema applies via activeMarket(). */
  status: "live" | "parked" | "draft"
  flagLabel: string
  hint: string
}

/** ISO codes that may appear in the header switcher. */
export const SWITCHER_MARKETS: MarketSwitchOption[] = [
  {
    iso: LIVE_MARKET.iso,
    name: LIVE_MARKET.name,
    status: "live",
    flagLabel: "🇮🇳 IN",
    hint: "Live market — INR, GST 18%, +91, UPI/eNACH demo",
  },
  {
    iso: "CA",
    name: "Canada",
    status: "parked",
    flagLabel: "🇨🇦 CA",
    hint: "Parked until CountryPack promote — checklist alone does not switch schema",
  },
]

export function isParkedMarketIso(iso: string) {
  return (PARKED_MARKET_ISOS as readonly string[]).includes(iso.trim().toUpperCase())
}

export function isLiveMarketIso(iso: string) {
  return iso.trim().toUpperCase() === LIVE_MARKET.iso
}

/** Only live packs resolve a MarketProfile today. */
export function marketProfileForIso(iso: string): MarketProfile | null {
  const id = iso.trim().toUpperCase() as MarketId
  if (id in MARKETS) return MARKETS[id as MarketId]
  return null
}

export function liveMarketIsos(): string[] {
  return Object.keys(MARKETS)
}
