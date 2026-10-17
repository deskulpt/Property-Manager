"use client"

import { RazorpaySettings } from "@/components/landlord/razorpay-settings"
import { useMarket } from "@/components/market/market-provider"
import type { ShopSettingsPublic } from "@/lib/db"

/** India shop Razorpay keys — hidden when market=CA (Interac/Stripe prefs own that surface). */
export function IndiaShopPayments({ settings }: { settings: ShopSettingsPublic }) {
  const { marketId } = useMarket()
  if (marketId !== "IN") {
    return (
      <div data-testid="india-shop-payments-hidden">
        <h2 className="font-sans text-lg font-extrabold">Payments · Razorpay (India shop)</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Razorpay UPI keys apply when market is India. Switch the header flag (or Market & payments)
          to India to edit shop keys. Canada uses Interac + Stripe demo adapters above.
        </p>
      </div>
    )
  }
  return <RazorpaySettings settings={settings} />
}
