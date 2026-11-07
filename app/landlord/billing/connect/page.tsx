import Link from "next/link"
import { PageHeader } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import {
  buildMonthlyStatementAction,
  completeConnectOnboardingAction,
  startConnectOnboardingAction,
  startPadMandateAction,
  startRentCheckoutAction,
} from "@/lib/billing/ca-connect-actions"
import { CANADA_CONNECT_E2E, canadaConnectE2EStatus } from "@/lib/billing/ca-connect-e2e"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Canada Connect (demo)" }

export default async function CanadaConnectHubPage({
  searchParams,
}: {
  searchParams: Promise<{
    onboard?: string
    pad?: string
    checkout?: string
    error?: string
  }>
}) {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const params = await searchParams
  const status = canadaConnectE2EStatus(user.tenantId)
  const activePad = status.mandates.find((m) => m.status === "active")

  const notice = params.error
    ? params.error
    : params.onboard === "done"
      ? "Connect onboarding completed (demo). Charges/payouts marked enabled locally — no live Stripe."
      : params.pad === "active"
        ? "PAD mandate active (demo). Optional — never mandatory."
        : params.checkout === "demo_settled"
          ? "Rent checkout settled in demo mode. No live charge."
          : null

  return (
    <div>
      <PageHeader
        kicker="Canada · Stripe Connect"
        title="Rent collection E2E (demo)"
        lede="Landlord onboard → optional PAD → hosted Checkout → monthly statement. Flag ontarioConnectDirectPad stays OFF. India money plane parked. No live charges."
      />

      {notice ? (
        <p
          className="mt-4 border border-brand/20 bg-accent px-4 py-3 text-sm text-brand"
          role="status"
        >
          {notice}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 text-sm">
        <section className="border border-ink/10 bg-card p-4">
          <h2 className="font-sans text-base font-extrabold">Pipeline status</h2>
          <ul className="mt-2 space-y-1 text-ink-soft">
            <li>
              Live: <strong>OFF</strong> · Flag{" "}
              <code className="font-mono text-xs">{CANADA_CONNECT_E2E.featureFlag}</code> OFF
            </li>
            <li>
              Onboarded: <strong>{status.onboarded ? "yes" : "no"}</strong>
              {status.account ? (
                <>
                  {" "}
                  · <code className="font-mono text-xs">{status.account.connectedAccountId}</code>
                </>
              ) : null}
            </li>
            <li>
              Active PAD: <strong>{status.hasActivePad ? "yes (optional)" : "no"}</strong>
            </li>
            <li>
              Demo settlement: <strong>{status.hasDemoSettlement ? "yes" : "no"}</strong>
            </li>
            <li>India money parked: <strong>yes</strong></li>
          </ul>
        </section>

        <section className="border border-ink/10 bg-card p-4">
          <h2 className="font-sans text-base font-extrabold">1. Connect onboarding</h2>
          <p className="mt-1 text-ink-soft">
            Demo Account Link for Express connected account (CA). Completes locally only.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={startConnectOnboardingAction}>
              <SubmitButton>Start onboarding</SubmitButton>
            </form>
            {status.account && status.account.status !== "onboarded" ? (
              <form action={completeConnectOnboardingAction}>
                <SubmitButton>Mark onboarded (demo)</SubmitButton>
              </form>
            ) : null}
          </div>
        </section>

        <section className="border border-ink/10 bg-card p-4">
          <h2 className="font-sans text-base font-extrabold">2. PAD mandate (optional)</h2>
          <p className="mt-1 text-ink-soft">
            ACSS debit / PAD — Legal: optional, never mandatory. Requires onboarded account.
          </p>
          {status.onboarded ? (
            <form action={startPadMandateAction} className="mt-3 grid max-w-sm gap-2">
              <label className="grid gap-1">
                <span className="font-medium">Bank last 4 (demo)</span>
                <input
                  name="bank_last4"
                  defaultValue="4242"
                  maxLength={4}
                  className="h-10 border border-ink/20 bg-paper px-3 font-mono"
                />
              </label>
              <SubmitButton>Set up PAD</SubmitButton>
            </form>
          ) : (
            <p className="mt-3 text-ink-soft">Complete onboarding first.</p>
          )}
        </section>

        <section className="border border-ink/10 bg-card p-4">
          <h2 className="font-sans text-base font-extrabold">3. Hosted Checkout (DIRECT + PAD)</h2>
          <p className="mt-1 text-ink-soft">
            Builds Stripe Checkout Session body for Connect DIRECT + application fee (HST by
            Deskulpt). Opens demo hosted page — never live-charges.
          </p>
          {status.onboarded ? (
            <form action={startRentCheckoutAction} className="mt-3 grid max-w-sm gap-2">
              <label className="grid gap-1">
                <span className="font-medium">Rent (CAD cents)</span>
                <input
                  name="rent_cad_cents"
                  type="number"
                  min={100}
                  defaultValue={200000}
                  className="h-10 border border-ink/20 bg-paper px-3 font-mono"
                />
              </label>
              {activePad ? (
                <input type="hidden" name="pad_mandate_id" value={activePad.id} />
              ) : null}
              <SubmitButton>Open demo checkout</SubmitButton>
            </form>
          ) : (
            <p className="mt-3 text-ink-soft">Complete onboarding first.</p>
          )}
        </section>

        <section className="border border-ink/10 bg-card p-4">
          <h2 className="font-sans text-base font-extrabold">4. Monthly statement</h2>
          <p className="mt-1 text-ink-soft">
            Application-fee lines + GST/HST footer from CANADA_PACK.taxRegistrationId.
          </p>
          <form action={buildMonthlyStatementAction} className="mt-3">
            <SubmitButton>Build this month&apos;s statement</SubmitButton>
          </form>
          <p className="mt-3">
            <Link
              href="/landlord/billing/connect/statement"
              className="font-semibold text-terra hover:underline"
            >
              View statements
            </Link>
          </p>
        </section>

        <p>
          <Link href="/landlord/billing" className="font-semibold text-terra hover:underline">
            Back to billing
          </Link>
        </p>
      </div>
    </div>
  )
}
