import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { submitTicketTransition } from "@/lib/actions"
import { ticketsForTenant } from "@/lib/db"
import { formatDay, statusLabel } from "@/lib/format"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Tickets" }

export default async function LandlordTicketsPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const tickets = ticketsForTenant(user.tenantId)

  return (
    <div>
      <PageHeader
        kicker="Occupant requests"
        title="Tickets for this organisation."
        lede="Open → in progress → resolved → closed. Only tickets for your landlord tenant appear here."
      />
      {tickets.length === 0 ? (
        <EmptyState title="No tickets" body="When an occupant files a complaint or request, it lands in this inbox." />
      ) : (
        <ul className="grid gap-3">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="bg-card p-4 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-lg font-extrabold">{ticket.subject}</h2>
                <StatusBadge status={ticket.status} />
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {ticket.occupantName} · {statusLabel(ticket.category)} · Unit {ticket.unitCode} ·{" "}
                {ticket.propertyName}
              </p>
              <p className="mt-2 text-sm">{ticket.body}</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                {formatDay(ticket.createdAt.slice(0, 10))}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ticket.status === "open" ? (
                  <form action={submitTicketTransition}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="next" value="in_progress" />
                    <SubmitButton pendingLabel="Updating…">Start progress</SubmitButton>
                  </form>
                ) : null}
                {ticket.status === "in_progress" ? (
                  <form action={submitTicketTransition}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="next" value="resolved" />
                    <SubmitButton pendingLabel="Updating…">Mark resolved</SubmitButton>
                  </form>
                ) : null}
                {(ticket.status === "open" || ticket.status === "in_progress") && (
                  <form action={submitTicketTransition}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="next" value="cancelled" />
                    <SubmitButton variant="outline" pendingLabel="Cancelling…">
                      Cancel
                    </SubmitButton>
                  </form>
                )}
                {ticket.status === "resolved" ? (
                  <form action={submitTicketTransition}>
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="next" value="closed" />
                    <SubmitButton pendingLabel="Closing…">Close</SubmitButton>
                  </form>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
