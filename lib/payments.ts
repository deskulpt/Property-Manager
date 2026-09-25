import "server-only"

/**
 * Payment provider boundary. The demo adapter never contacts a processor
 * and never stores a full card number. A live adapter can implement the
 * same methods later.
 */
export interface PaymentProvider {
  readonly name: string
  attachMethod(input: {
    userId: string
    tenantId: string
    last4: string
    autopay: boolean
  }): { providerRef: string; brand: string; last4: string }
  setAutopay(input: { providerRef: string; enabled: boolean }): {
    ok: true
    demo: true
  }
  collect(input: {
    providerRef: string
    amountCents: number
    description: string
  }): { ok: true; demo: true; reference: string }
}

export const demoPayments: PaymentProvider = {
  name: "demo",
  attachMethod(input) {
    return {
      providerRef: `demo_pad_${input.last4}_${input.tenantId}`,
      brand: "Pre-authorized debit (demo)",
      last4: input.last4,
    }
  },
  setAutopay() {
    return { ok: true, demo: true }
  },
  collect(input) {
    return {
      ok: true,
      demo: true,
      reference: `demo_txn_${input.providerRef}_${input.amountCents}`,
    }
  },
}
