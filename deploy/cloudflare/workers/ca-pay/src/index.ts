/**
 * Reserved ca-pay.easyrental.space Worker stub.
 *
 * OFF by default — Admin compliance flag `caPayPlane` must stay false until
 * Legal/Finance approve Stripe Connect + EU D1 ledger cutover.
 * Do not publish routes or create DNS while this file is a stub.
 */

export interface Env {
  LEDGER?: D1Database
  EASYRENTAL_FLAG_CA_PAY_PLANE?: string
}

export default {
  async fetch(_request: Request, env: Env): Promise<Response> {
    if (env.EASYRENTAL_FLAG_CA_PAY_PLANE !== "1") {
      return new Response("ca-pay plane disabled", { status: 503 })
    }
    return new Response("ca-pay plane not implemented", { status: 501 })
  },
}
