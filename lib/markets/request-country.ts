import { cookies, headers } from "next/headers"
import { MARKET_COOKIE, normalizeMarketIso } from "@/lib/markets/cookie"
import { COUNTRY_CONSENT_COOKIE, COUNTRY_HEADER } from "@/lib/markets/path-segments"

/** Resolve active country ISO for the current request (header → consent → market cookie → IN). */
export async function requestCountryIso(): Promise<string> {
  const hdrs = await headers()
  const fromHeader = hdrs.get(COUNTRY_HEADER)
  if (fromHeader) return normalizeMarketIso(fromHeader)
  const jar = await cookies()
  const consent = jar.get(COUNTRY_CONSENT_COOKIE)?.value
  if (consent) return normalizeMarketIso(consent)
  const market = jar.get(MARKET_COOKIE)?.value
  if (market) return normalizeMarketIso(market)
  return "IN"
}
