/**
 * Per-country payment rails — fail-closed feature flags.
 * CA: Stripe Connect DIRECT + PAD (ontarioConnectDirectPad OFF).
 * IN: Razorpay Indian entity OFF until entity + written acceptance.
 */

import { legalFlag } from "@/lib/markets/legal-flags"
import { builtinPack } from "@/lib/markets/packs"
import type { CountryPack } from "@/lib/markets/types"

export type PaymentRailStatus = {
  iso: string
  rails: string[]
  connectDirectPad: boolean
  razorpayIndianEntity: boolean
  routeHolds: boolean
  depositHolds: boolean
  liveEnabled: string[]
  blocked: string[]
}

export function paymentRailsForIso(iso: string, pack?: CountryPack | null): PaymentRailStatus {
  const resolved = pack ?? builtinPack(iso)
  const rails = resolved?.paymentRails?.kinds ?? []
  const connectDirectPad = legalFlag(iso, "ontarioConnectDirectPad", resolved)
  const razorpayIndianEntity = legalFlag(iso, "razorpayIndianEntity", resolved)
  const routeHolds = legalFlag(iso, "routeHolds", resolved)
  const depositHolds = legalFlag(iso, "depositHolds", resolved)

  const liveEnabled: string[] = []
  const blocked: string[] = []

  for (const rail of rails) {
    if (rail === "stripe_connect_direct_pad") {
      if (connectDirectPad) liveEnabled.push(rail)
      else blocked.push(`${rail} (ontarioConnectDirectPad OFF)`)
      continue
    }
    if (rail === "razorpay_in_entity") {
      if (razorpayIndianEntity) liveEnabled.push(rail)
      else blocked.push(`${rail} (razorpayIndianEntity OFF)`)
      continue
    }
    // Demo / label rails stay available as synthetic adapters.
    if (rail.endsWith("_demo") || rail === "interac_demo" || rail === "upi_demo" || rail === "enach_demo") {
      liveEnabled.push(rail)
    } else if (rail === "stripe_subscriptions_ca") {
      // Deskulpt CA SaaS subscriptions path — config present; live keys still go-live gated.
      liveEnabled.push(rail)
    } else {
      blocked.push(`${rail} (fail-closed)`)
    }
  }

  if (!routeHolds) blocked.push("route_holds (OFF)")
  if (!depositHolds) blocked.push("deposit_holds (OFF)")

  return {
    iso: iso.toUpperCase(),
    rails,
    connectDirectPad,
    razorpayIndianEntity,
    routeHolds,
    depositHolds,
    liveEnabled,
    blocked,
  }
}

/** True only when CA Connect DIRECT+PAD flag is explicitly ON. */
export function canUseOntarioConnectDirectPad(iso = "CA"): boolean {
  return legalFlag(iso, "ontarioConnectDirectPad")
}

/** True only when IN Razorpay Indian-entity rail is explicitly ON. */
export function canUseRazorpayIndianEntity(iso = "IN"): boolean {
  return legalFlag(iso, "razorpayIndianEntity")
}
