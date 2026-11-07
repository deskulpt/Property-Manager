import { PageHeader } from "@/components/product"
import { getSessionUser } from "@/lib/session"
import Link from "next/link"

export const metadata = { title: "Canada Connect checkout (demo)" }

/**
 * Design-test stand-in for Stripe-hosted Checkout (Connect DIRECT + PAD).
 * Live charges stay OFF until ontarioConnectDirectPad + Legal before-live list.
 */
export default async function CanadaConnectCheckoutDemoPage({
  searchParams,
}: {
  searchParams: Promise<{
    ref?: string
    acct?: string
    rent?: string
    fee?: string
    provider?: string
  }>
}) {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const params = await searchParams

  return (
    <div>
      <PageHeader
        kicker="Canada · Stripe Connect"
        title="Hosted checkout (demo)"
        lede="Stand-in for Stripe-hosted Checkout on the landlord connected account (DIRECT + PAD). Live path is feature-flagged OFF — India money plane is parked."
      />
      <div className="mt-6 space-y-3 border border-ink/10 bg-card p-4 text-sm">
        <p>
          Provider:{" "}
          <code className="font-mono text-xs">{params.provider ?? "stripe_connect_ca"}</code>
        </p>
        <p>
          Connected account:{" "}
          <code className="font-mono text-xs">{params.acct ?? "—"}</code>
        </p>
        <p>
          Rent (CAD cents): <strong>{params.rent ?? "—"}</strong>
        </p>
        <p>
          Application fee incl. HST (CAD cents): <strong>{params.fee ?? "—"}</strong>
        </p>
        <p>
          Client ref: <code className="font-mono text-xs">{params.ref ?? "—"}</code>
        </p>
        <p className="text-ink-soft">
          No live charge in this build. Flag <code className="font-mono text-xs">ontarioConnectDirectPad</code>{" "}
          remains OFF until Legal.
        </p>
        <p className="pt-2 font-semibold">
          <Link href="/landlord/billing" className="text-terra hover:underline">
            Back to billing
          </Link>
        </p>
      </div>
    </div>
  )
}
