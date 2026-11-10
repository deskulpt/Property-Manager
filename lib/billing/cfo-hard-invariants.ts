/**
 * CFO architecture HARD rules (2026-11-10) — NOT settings.
 *
 * (a) Stripe Connect direct charges only — never destination
 * (b) Rent / deposit funds never settle in a Deskulpt account
 * (c) Every charge/invoice records tax identity from day one
 * (d) Audit log append-only (see lib/audit/append-only.ts)
 *
 * Live money flags stay OFF. These invariants guard builders + demo paths
 * so a future enable cannot silently violate Finance policy.
 */

import {
  buildInvoiceTaxIdentity,
  type InvoiceTaxIdentity,
  type InvoiceTaxIdentityInput,
} from "@/lib/billing/invoice-tax-identity"

export const CFO_HARD_POLICY_VERSION = "2026-11-10" as const

/** Forbidden Stripe Connect charge shapes for rent / landlord money. */
export const FORBIDDEN_CONNECT_CHARGE_TYPES = [
  "destination",
  "separate_charges",
  "separate_charges_and_transfers",
] as const

export type ConnectChargeType = "direct" | (typeof FORBIDDEN_CONNECT_CHARGE_TYPES)[number]

export type CfoHardCheck =
  | { ok: true; policyVersion: typeof CFO_HARD_POLICY_VERSION }
  | { ok: false; code: string; error: string; policyVersion: typeof CFO_HARD_POLICY_VERSION }

/**
 * Fail closed if a checkout/PaymentIntent plan uses destination or transfer_data.
 * DIRECT requires Stripe-Account header on the connected account — never platform destination.
 */
export function assertDirectChargeOnly(input: {
  chargeType?: string | null
  /** Raw Stripe-shaped body — reject transfer_data / on_behalf_of destination patterns. */
  stripeBody?: Record<string, unknown> | null
}): CfoHardCheck {
  const chargeType = (input.chargeType ?? "direct").toLowerCase()
  if (
    (FORBIDDEN_CONNECT_CHARGE_TYPES as readonly string[]).includes(chargeType) ||
    chargeType !== "direct"
  ) {
    return {
      ok: false,
      code: "destination_forbidden",
      error: `Stripe Connect chargeType "${chargeType}" forbidden — DIRECT only (CFO HARD a).`,
      policyVersion: CFO_HARD_POLICY_VERSION,
    }
  }

  const body = input.stripeBody
  if (body) {
    const pi = body.payment_intent_data
    if (pi && typeof pi === "object") {
      const piRec = pi as Record<string, unknown>
      if (piRec.transfer_data != null) {
        return {
          ok: false,
          code: "transfer_data_forbidden",
          error:
            "payment_intent_data.transfer_data is destination-style — forbidden (CFO HARD a).",
          policyVersion: CFO_HARD_POLICY_VERSION,
        }
      }
      // on_behalf_of alone is allowed for some DIRECT patterns; transfer_data is not.
    }
    if (body.transfer_data != null) {
      return {
        ok: false,
        code: "transfer_data_forbidden",
        error: "transfer_data on Checkout Session is destination-style — forbidden (CFO HARD a).",
        policyVersion: CFO_HARD_POLICY_VERSION,
      }
    }
  }

  return { ok: true, policyVersion: CFO_HARD_POLICY_VERSION }
}

/**
 * Rent and deposits never settle on Deskulpt platform balance.
 * Deskulpt may take an application_fee only on DIRECT landlord charges.
 */
export function assertRentNeverOnDeskulptBooks(input: {
  /** Who receives the rent principal. */
  rentSettlementAccount: "landlord_connected" | "deskulpt_platform" | "unknown"
  /** Deposit hold / escrow on Deskulpt books. */
  depositHeldByDeskulpt?: boolean
}): CfoHardCheck {
  if (input.depositHeldByDeskulpt === true) {
    return {
      ok: false,
      code: "deposit_on_deskulpt_forbidden",
      error: "Deposit funds must never settle in a Deskulpt account (CFO HARD b).",
      policyVersion: CFO_HARD_POLICY_VERSION,
    }
  }
  if (input.rentSettlementAccount !== "landlord_connected") {
    return {
      ok: false,
      code: "rent_on_deskulpt_forbidden",
      error:
        "Rent principal must settle on landlord connected account — never Deskulpt (CFO HARD b).",
      policyVersion: CFO_HARD_POLICY_VERSION,
    }
  }
  return { ok: true, policyVersion: CFO_HARD_POLICY_VERSION }
}

/** Day-one tax identity required on every charge/invoice (CFO HARD c). */
export function assertInvoiceTaxIdentity(
  input: InvoiceTaxIdentityInput,
): CfoHardCheck & { identity?: InvoiceTaxIdentity } {
  try {
    const identity = buildInvoiceTaxIdentity(input)
    return { ok: true, policyVersion: CFO_HARD_POLICY_VERSION, identity }
  } catch (err) {
    return {
      ok: false,
      code: "tax_identity_incomplete",
      error: err instanceof Error ? err.message : "Invoice tax identity incomplete (CFO HARD c).",
      policyVersion: CFO_HARD_POLICY_VERSION,
    }
  }
}

/** Compose a–c checks for Connect rent checkout builders. */
export function assertCfoHardConnectRentPlan(input: {
  chargeType: string
  stripeBody: Record<string, unknown>
  rentSettlementAccount: "landlord_connected" | "deskulpt_platform" | "unknown"
  depositHeldByDeskulpt?: boolean
  taxIdentity: InvoiceTaxIdentityInput
}): CfoHardCheck & { identity?: InvoiceTaxIdentity } {
  const a = assertDirectChargeOnly({
    chargeType: input.chargeType,
    stripeBody: input.stripeBody,
  })
  if (!a.ok) return a
  const b = assertRentNeverOnDeskulptBooks({
    rentSettlementAccount: input.rentSettlementAccount,
    depositHeldByDeskulpt: input.depositHeldByDeskulpt,
  })
  if (!b.ok) return b
  return assertInvoiceTaxIdentity(input.taxIdentity)
}
