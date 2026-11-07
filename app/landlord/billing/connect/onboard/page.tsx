import Link from "next/link"
import { PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { completeConnectOnboardingAction } from "@/lib/billing/ca-connect-actions"
import { getCaConnectAccount } from "@/lib/billing/ca-connect-store"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Connect onboarding (demo)" }

export default async function CanadaConnectOnboardDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ acct?: string; return?: string }>
}) {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const params = await searchParams
  const account = getCaConnectAccount(user.tenantId)

  return (
    <div>
      <PageHeader
        kicker="Canada · Stripe Connect"
        title="Account Link (demo)"
        lede="Stand-in for Stripe Express Account Link. Completing this only updates local demo state — no live onboarding API call."
      />
      <div className="mt-6 space-y-3 border border-ink/10 bg-card p-4 text-sm">
        <p>
          Connected account:{" "}
          <code className="font-mono text-xs">
            {params.acct ?? account?.connectedAccountId ?? "—"}
          </code>
        </p>
        <p>
          Status: <strong>{account?.status ?? "—"}</strong>
        </p>
        <p className="text-ink-soft">
          Live Connect remains OFF until Legal clears ontarioConnectDirectPad and before-live list.
        </p>
        {account?.status !== "onboarded" ? (
          <form action={completeConnectOnboardingAction} className="pt-2">
            <SubmitButton>Complete demo onboarding</SubmitButton>
          </form>
        ) : (
          <p className="font-semibold text-brand">Already onboarded (demo).</p>
        )}
        <p className="pt-2">
          <Link href="/landlord/billing/connect" className="text-terra hover:underline">
            Back to Connect hub
          </Link>
        </p>
      </div>
    </div>
  )
}
