import "server-only"
import { cookies } from "next/headers"
import {
  DEFAULT_MARKET_ID,
  MARKET_COOKIE,
  parseMarketId,
  type MarketId,
} from "@/lib/market"

/** Read preferred market from the `market` cookie (IN | CA). Default India. */
export async function getPreferredMarketId(): Promise<MarketId> {
  const jar = await cookies()
  return parseMarketId(jar.get(MARKET_COOKIE)?.value)
}
