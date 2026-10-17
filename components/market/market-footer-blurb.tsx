"use client"

import { useMarket } from "@/components/market/market-provider"

export function MarketFooterBlurb() {
  const { market, marketId } = useMarket()
  const blurb =
    marketId === "CA"
      ? "Industrial leasing desk for Canada — warehouses, yards, and parks. A product of DeSkulpt Inc."
      : "Industrial leasing desk for India — warehouses, yards, and parks. A product of DeSkulpt Inc."
  const meta =
    marketId === "CA"
      ? `CAD · ${market.phoneCountryCode} · Canada (demo)`
      : `INR · ${market.phoneCountryCode} · India`

  return (
    <>
      <p className="mt-4 text-sm leading-relaxed text-paper/75">{blurb}</p>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-paper/45">
        {meta}
      </p>
    </>
  )
}
