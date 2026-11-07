import Link from "next/link"
import { PageHeader } from "@/components/product"
import { buildMonthlyStatementAction } from "@/lib/billing/ca-connect-actions"
import {
  readCanadaLandlordMonthlyStatement,
} from "@/lib/billing/ca-connect-e2e"
import { listCaLandlordStatements } from "@/lib/billing/ca-connect-store"
import { SubmitButton } from "@/components/submit-button"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Landlord statement (demo)" }

function formatCadCents(cents: number): string {
  return `C$${(cents / 100).toFixed(2)}`
}

export default async function CanadaLandlordStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const params = await searchParams
  const rows = listCaLandlordStatements(user.tenantId)
  const period =
    params.period ?? rows[0]?.periodYyyyMm ?? new Date().toISOString().slice(0, 7)
  const statement = readCanadaLandlordMonthlyStatement(user.tenantId, period)

  return (
    <div>
      <PageHeader
        kicker="Canada · Statement"
        title="Monthly landlord statement (demo)"
        lede="Application fees with HST computed by Deskulpt. GST/HST # from CANADA_PACK. Demo settlements only — no live Connect."
      />

      <form action={buildMonthlyStatementAction} className="mt-4">
        <input type="hidden" name="period" value={period} />
        <SubmitButton>Refresh statement for {period}</SubmitButton>
      </form>

      {statement ? (
        <div className="mt-6 space-y-3 border border-ink/10 bg-card p-4 text-sm">
          <p>
            Period: <strong>{statement.periodYyyyMm}</strong> · {statement.sellerLegalName}
          </p>
          <p>
            GST/HST #: <code className="font-mono text-xs">{statement.gstHstNumber}</code>
          </p>
          <p>
            Connected account:{" "}
            <code className="font-mono text-xs">{statement.connectedAccountId ?? "—"}</code>
          </p>
          <ul className="mt-2 space-y-1">
            {statement.lines.length === 0 ? (
              <li className="text-ink-soft">No demo-settled checkouts in this period.</li>
            ) : (
              statement.lines.map((line) => (
                <li key={line.checkoutId} className="font-mono text-xs">
                  {line.clientReferenceId} · rent {formatCadCents(line.rentCadCents)} · fee{" "}
                  {formatCadCents(line.applicationFeeInclusiveCadCents)}
                </li>
              ))
            )}
          </ul>
          <div className="mt-3 border-t border-ink/10 pt-3">
            <p>Rent total: {formatCadCents(statement.totals.rentCadCents)}</p>
            <p>
              App fee excl. HST:{" "}
              {formatCadCents(statement.totals.applicationFeeExclusiveCadCents)}
            </p>
            <p>HST: {formatCadCents(statement.totals.hstCadCents)}</p>
            <p>
              App fee incl. HST:{" "}
              {formatCadCents(statement.totals.applicationFeeInclusiveCadCents)}
            </p>
            <p className="mt-2 text-ink-soft">{statement.taxFooter.note}</p>
          </div>
          <p className="text-ink-soft">Demo only · live charge: never</p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-ink-soft">No statement for {period} yet.</p>
      )}

      {rows.length > 1 ? (
        <ul className="mt-4 space-y-1 text-sm">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/landlord/billing/connect/statement?period=${encodeURIComponent(row.periodYyyyMm)}`}
                className="text-terra hover:underline"
              >
                {row.periodYyyyMm}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-6 text-sm">
        <Link href="/landlord/billing/connect" className="font-semibold text-terra hover:underline">
          Back to Connect hub
        </Link>
      </p>
    </div>
  )
}
