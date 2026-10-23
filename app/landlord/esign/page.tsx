import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { submitSendEnvelope } from "@/lib/actions"
import { envelopesForTenant, leasesForTenant } from "@/lib/db"
import { formatDay } from "@/lib/format"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "E-sign" }

export default async function LandlordEsignPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const leases = leasesForTenant(user.tenantId)
  const envelopes = envelopesForTenant(user.tenantId)

  return (
    <div>
      <PageHeader
        kicker="demoESign"
        title="Lease and addendum packets."
        lede="Send a document to an active occupant. The demo adapter stamps locally — no DocuSign keys required. UI always labels demo vs live."
      />
      {leases.length === 0 ? (
        <EmptyState title="No active leases" body="Approve an application to create a lease, then send a packet." />
      ) : (
        <form action={submitSendEnvelope} className="mb-8 grid gap-3 bg-card p-4 ring-1 ring-foreground/10 md:grid-cols-3">
          <label className="grid gap-1 text-sm md:col-span-1">
            Lease
            <select name="leaseId" required className="h-9 border border-input bg-background px-2" defaultValue={leases[0]?.id}>
              {leases.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  Unit {lease.unitCode} · {lease.propertyName}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm md:col-span-1">
            Document name
            <input
              name="documentName"
              required
              minLength={3}
              className="h-9 border border-input bg-background px-2"
              placeholder="Lease addendum · CAM"
            />
          </label>
          <div className="flex items-end">
            <SubmitButton pendingLabel="Sending…">Send via demoESign</SubmitButton>
          </div>
        </form>
      )}
      {envelopes.length === 0 ? (
        <EmptyState title="No packets yet" body="Sent envelopes show status draft → sent → completed." />
      ) : (
        <ul className="grid gap-3">
          {envelopes.map((envelope) => (
            <li key={envelope.id} className="bg-card p-4 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-lg font-extrabold">{envelope.documentName}</h2>
                <StatusBadge status={envelope.status} />
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {envelope.occupantName} · Unit {envelope.unitCode} · adapter demoESign
              </p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                {formatDay(envelope.createdAt.slice(0, 10))}
              </p>
              {envelope.signedPath ? (
                <a href={envelope.signedPath} className="mt-3 inline-block text-sm font-bold text-brand" target="_blank" rel="noreferrer">
                  Download stamp →
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
