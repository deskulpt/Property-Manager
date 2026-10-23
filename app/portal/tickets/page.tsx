import { DoNextFaq } from "@/components/cms/do-next-faq"
import { TicketForm } from "@/components/portal/ticket-form"
import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { submitTicketTransition } from "@/lib/actions"
import { leasesForOccupant, ticketsForOccupant } from "@/lib/db"
import { formatDay, statusLabel } from "@/lib/format"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Tickets" }

export default async function PortalTicketsPage() {
  const user = await getSessionUser()
  if (!user) return null
  const tickets = ticketsForOccupant(user.id)
  const leases = leasesForOccupant(user.id)
    .filter((lease) => lease.id)
    .map((lease) => ({
      id: lease.id!,
      unitCode: lease.unitCode,
      propertyName: lease.propertyName,
    }))

  return (
    <div>
      <PageHeader
        kicker="Support"
        title="Tickets"
        lede="Open facility requests for your leased bay. Cancel if the issue is resolved elsewhere."
      />
      {leases.length > 0 ? (
        <div className="mb-8">
          <TicketForm leases={leases} />
        </div>
      ) : null}
      {tickets.length === 0 ? (
        <EmptyState title="No tickets yet" body="Open one above when something needs the landlord or a trade." />
      ) : (
        <ul className="grid gap-3">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="border border-ink/10 bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{ticket.subject}</h2>
                <StatusBadge
                  status={
                    ticket.status === "in_progress"
                      ? "pending"
                      : ticket.status === "resolved"
                        ? "complete"
                        : ticket.status
                  }
                />
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {statusLabel(ticket.category)} · Unit {ticket.unitCode} · {ticket.propertyName}
              </p>
              <p className="mt-2 text-sm text-ink-soft">{ticket.body}</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                {formatDay(ticket.createdAt.slice(0, 10))}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(ticket.status === "open" || ticket.status === "in_progress") && (
                  <form action={submitTicketTransition}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="next" value="cancelled" />
                    <SubmitButton variant="outline" pendingLabel="Cancelling…">
                      Cancel ticket
                    </SubmitButton>
                  </form>
                )}
                {ticket.status === "resolved" && (
                  <form action={submitTicketTransition}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="next" value="closed" />
                    <SubmitButton pendingLabel="Closing…">Confirm closed</SubmitButton>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <DoNextFaq
        steps={[
          { title: "Describe the issue clearly", body: "Include bay code and access timing." },
          { title: "Watch inbox notices", body: "Status updates land in Inbox and WhatsApp demo logs." },
          { title: "Cancel when done", body: "Keep the queue clean after the work is finished." },
        ]}
        faqs={[
          { q: "Who assigns the trade?", a: "The landlord approves a provider, then assigns a concierge job — never auto-assign." },
        ]}
      />
    </div>
  )
}
