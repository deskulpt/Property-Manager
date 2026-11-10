/**
 * ca-pay.easyrental.space Worker stub (Canada payment plane — active stub focus).
 *
 * OFF by default — Admin flag `ca-pay` + `ontarioConnectDirectPad` stay false until
 * Legal/Finance approve Stripe Connect + EU D1 ledger cutover.
 * Do not publish routes or create DNS while this file is a stub.
 *
 * India `in-pay` is PARKED separately — no sibling Worker in this pack.
 */

export interface Env {
  LEDGER?: D1Database
  EASYRENTAL_FLAG_CA_PAY?: string
}

export default {
  async fetch(_request: Request, env: Env): Promise<Response> {
    if (env.EASYRENTAL_FLAG_CA_PAY !== "1") {
      return new Response("ca-pay plane disabled (Stripe Connect stub OFF)", {
        status: 503,
      })
    }
    return new Response("ca-pay Stripe Connect plane not implemented", {
      status: 501,
    })
  },
}
