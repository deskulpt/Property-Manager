"use client"

import { MARKETS, type MarketId } from "@/lib/market"
import { useMarket } from "@/components/market/market-provider"

const OPTIONS: MarketId[] = ["IN", "CA"]

export function FlagSwitcher({ className = "" }: { className?: string }) {
  const { marketId, setMarketId } = useMarket()

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-sm border border-ink/15 bg-paper-2 p-0.5 ${className}`}
      role="group"
      aria-label="Market"
    >
      {OPTIONS.map((id) => {
        const profile = MARKETS[id]
        const active = marketId === id
        return (
          <button
            key={id}
            type="button"
            data-testid={`market-flag-${id}`}
            aria-pressed={active}
            aria-label={`${profile.name} market`}
            title={profile.name}
            onClick={() => setMarketId(id)}
            className={`inline-flex items-center gap-1 px-2 py-1 text-[12px] font-semibold tracking-tight transition-colors ${
              active
                ? "bg-brand text-paper"
                : "text-ink-soft hover:bg-paper hover:text-ink"
            }`}
          >
            <span aria-hidden className="text-[14px] leading-none">
              {profile.flag}
            </span>
            <span className="hidden sm:inline">{id === "IN" ? "India" : "Canada"}</span>
          </button>
        )
      })}
    </div>
  )
}
