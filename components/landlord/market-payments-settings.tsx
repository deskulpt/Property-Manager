"use client"

import { useEffect, useState } from "react"
import { CreditCard, Landmark } from "lucide-react"
import { FlagSwitcher } from "@/components/market/flag-switcher"
import { useMarket } from "@/components/market/market-provider"
import type { PaymentGatewayId } from "@/lib/market"

const GATEWAY_PREF_KEY = "paymentGatewayPref"

function readGatewayPref(marketId: string, fallback: PaymentGatewayId): PaymentGatewayId {
  try {
    const raw = localStorage.getItem(`${GATEWAY_PREF_KEY}:${marketId}`)
    if (raw === "razorpay" || raw === "interac" || raw === "stripe") return raw
  } catch {
    /* private mode */
  }
  return fallback
}

function writeGatewayPref(marketId: string, id: PaymentGatewayId) {
  try {
    localStorage.setItem(`${GATEWAY_PREF_KEY}:${marketId}`, id)
  } catch {
    /* ignore */
  }
}

/**
 * Settings → Market & payments — preference layer only.
 * Flag switch changes currency/tax/gateways/verify kinds; does not fork routes.
 */
export function MarketPaymentsSettings() {
  const { market, marketId } = useMarket()
  const defaultGw = market.paymentGateways[0]?.id ?? "razorpay"
  const [activeGateway, setActiveGateway] = useState<PaymentGatewayId>(defaultGw)
  const [demoOn, setDemoOn] = useState(true)

  useEffect(() => {
    const nextDefault = market.paymentGateways[0]?.id ?? "razorpay"
    setActiveGateway(readGatewayPref(marketId, nextDefault))
  }, [marketId, market.paymentGateways])

  function selectGateway(id: PaymentGatewayId) {
    setActiveGateway(id)
    writeGatewayPref(marketId, id)
  }

  return (
    <div data-testid="market-payments-settings">
      <h2 className="flex items-center gap-2 font-sans text-lg font-extrabold">
        <Landmark className="h-5 w-5 text-terra" aria-hidden />
        Market & payments
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        One app shell — market is a settings preference. Active market drives currency (
        {market.currency}), tax ({market.gstLabel}), logistics, verification options, and which
        payment gateways appear. No Canadian page-tree shard.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-ink">Active market</span>
        <FlagSwitcher />
        <span className="text-xs text-ink-faint" data-testid="market-currency-badge">
          {market.flag} {market.name} · {market.currency} · {market.gstLabel}
        </span>
      </div>

      <p className="mt-3 text-xs text-ink-soft">{market.dutiesTaxHint}</p>
      <p className="mt-1 text-xs text-ink-soft">{market.currencyLedgerNote}</p>

      <div className="mt-6">
        <h3 className="flex items-center gap-2 font-sans text-base font-bold">
          <CreditCard className="h-4 w-4 text-terra" aria-hidden />
          Payment providers ({market.name})
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          {marketId === "CA"
            ? "Canada uses Interac + Stripe / card demo adapters. India Razorpay UPI stays on market=IN."
            : "India default is Razorpay UPI / eNACH. Switch the header flag to Canada for Interac + Stripe."}
        </p>

        <ul className="mt-4 grid gap-3" role="list">
          {market.paymentGateways.map((gw) => {
            const selected = activeGateway === gw.id
            return (
              <li key={gw.id}>
                <button
                  type="button"
                  data-testid={`gateway-${gw.id}`}
                  aria-pressed={selected}
                  onClick={() => selectGateway(gw.id)}
                  className={`w-full border px-4 py-3 text-left transition-colors ${
                    selected
                      ? "border-brand bg-brand/5 ring-1 ring-brand/30"
                      : "border-ink/15 bg-card hover:border-ink/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink">{gw.label}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
                      {selected ? "Active" : "Select"}
                      {gw.demoOnly ? " · demo" : ""}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">{gw.hint}</p>
                </button>
              </li>
            )
          })}
        </ul>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={demoOn}
            onChange={(e) => setDemoOn(e.target.checked)}
            data-testid="gateway-demo-toggle"
            className="size-4 accent-brand"
          />
          <span>
            Demo mode (recommended) —{" "}
            {marketId === "CA"
              ? "Interac / Stripe stubs only; no live CAD processor"
              : "Razorpay UPI stubs only; no live NPCI / bank call"}
          </span>
        </label>
      </div>

      <div className="mt-6 border-t border-ink/10 pt-4">
        <h3 className="font-sans text-base font-bold">Verification options</h3>
        <ul className="mt-2 list-inside list-disc text-sm text-ink-soft">
          {market.idDocuments.map((doc) => (
            <li key={`${doc.country}-${doc.docType}`}>{doc.label}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink-faint">{market.verifyDocHint}</p>
      </div>
    </div>
  )
}
