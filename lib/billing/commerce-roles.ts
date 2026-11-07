/**
 * MoR vs processor model (D11 — NOT Aloke-approved; Finance/Eng/Legal AwC aligned).
 * Dodo = Merchant of Record; PayPal = processor only — not interchangeable.
 * Rent never through Deskulpt books.
 */

export type CommerceRole = "mor" | "processor" | "demo"

export const PROVIDER_COMMERCE_ROLE = {
  dodo: "mor",
  paypal: "processor",
  stripe: "processor",
  demo: "demo",
} as const satisfies Record<string, CommerceRole>

export function commerceRoleForProvider(
  name: "dodo" | "paypal" | "stripe" | "demo",
): CommerceRole {
  return PROVIDER_COMMERCE_ROLE[name]
}

/** Rent / deposits must not settle on Deskulpt platform MoR books. */
export function rentMaySettleOnPlatformBooks(): false {
  return false
}

export const D11_DOCUMENTED = {
  morPreferred: "dodo" as const,
  paypalIsMor: false,
  rentThroughDeskulptBooks: false,
  commissionsEnabled: false,
  rentCollectionEnabled: false,
  alokeApproved: false,
  labelledDemo: true as const,
}
