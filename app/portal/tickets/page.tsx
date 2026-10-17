import { DoNextFaq } from "@/components/cms/do-next-faq"
import { EmptyState, PageHeader, StatusBadge } from "@/components/product"
import { SubmitButton } from "@/components/submit-button"
import { cancelTicket, submitTicketForm } from "@/lib/actions"
import { formatDay } from "@/lib/format"
import { ticketsForUser } from "@/lib/role-cms-store"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Tickets" }

export default async function PortalTicketsPage() {
  const user = await getSessionUser()
  if (!user) return null
  const tickets = ticketsForUser(user.id)
  return (
    <div>
      <PageHeader kicker="Support" title="Tickets" lede="Open facility requests for your leased bay. Cancel if the issue is resolved elsewhere." />
      <form action={submitTicketForm} className="mb-8 grid gap-3 border border-ink/10 bg-card p-4" data-testid="ticket-form">
        <label className="grid gap-1 text-sm">
          Subject
          <input name="subject" required minLength={3} className="h-9 border border-ink/15 bg-paper px-2 text-sm" placeholder="Dock light out" />
        </label>
        <label className="grid gap-1 text-sm">
          Details
          <textarea name="body" required minLength={3} rows={3} className="border border-ink/15 bg-paper px-2 py-1.5 text-sm" placeholder="Describe the issue and bay access notes." />
        </label>
        <SubmitButton pendingLabel="Opening…">Open ticket</SubmitButton>
      </form>
      {tickets.length === 0 ? (
        <EmptyState title="No tickets yet" body="Open one above when something needs the landlord or a trade." />
      ) : (
        <ul className="grid gap-3">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="border border-ink/10 bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{ticket.subject}</h2>
                <StatusBadge status={ticket.status === "in_progress" ? "pending" : ticket.status === "resolved" ? "complete" : ticket.status} />
              </div>
              <p className="mt-1 text-sm text-ink-soft">{ticket.body}</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                {ticket.propertyName}
                {ticket.unitCode ? ` · Unit ${ticket.unitCode}` : ""} · {formatDay(ticket.createdAt.slice(0, 10))}
              </p>
              {ticket.status === "open" || ticket.status === "in_progress" ? (
                <form action={cancelTicket} className="mt-3">
                  <input type="hidden" name="ticketId" value={ticket.id} />
                  <SubmitButton variant="outline" pendingLabel="Cancelling…">Cancel ticket</SubmitButton>
                </form>
              ) : null}
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
