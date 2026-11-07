import Link from "next/link"
import { PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { completePadMandateAction } from "@/lib/billing/ca-connect-actions"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "PAD mandate (demo)" }

export default async function CanadaPadMandateDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ mandate?: string; acct?: string; last4?: string }>
}) {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const params = await searchParams

  return (
    <div>
      <PageHeader
        kicker="Canada · PAD / ACSS"
        title="Pre-authorized debit (demo)"
        lede="Optional PAD mandate setup. Legal: never mandatory. No live bank debit in this build."
      />
      <div className="mt-6 space-y-3 border border-ink/10 bg-card p-4 text-sm">
        <p>
          Mandate: <code className="font-mono text-xs">{params.mandate ?? "—"}</code>
        </p>
        <p>
          Connected account:{" "}
          <code className="font-mono text-xs">{params.acct ?? "—"}</code>
        </p>
        <p>
          Bank last4: <strong>{params.last4 ?? "—"}</strong>
        </p>
        <p className="text-ink-soft">Payment schedule: sporadic · transaction type: personal</p>
        {params.mandate ? (
          <form action={completePadMandateAction} className="pt-2">
            <input type="hidden" name="mandate_id" value={params.mandate} />
            <SubmitButton>Activate PAD (demo)</SubmitButton>
          </form>
        ) : (
          <p className="text-ink-soft">Missing mandate id — start from the Connect hub.</p>
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
