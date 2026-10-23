import Link from "next/link"
import { DoNextFaq } from "@/components/cms/do-next-faq"
import { PageHeader, StatusBadge } from "@/components/product"
import { activeLeasesForUser, ticketsForUser } from "@/lib/role-cms-store"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Occupant portal" }

export default async function PortalHomePage() {
  const user = await getSessionUser()
  if (!user) return null
  const leases = activeLeasesForUser(user.id)
  const tickets = ticketsForUser(user.id)
  const openTickets = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length
  return (
    <div>
      <PageHeader
        kicker={user.company ?? "Occupant"}
        title="Your lease desk"
        lede="Tickets, dues, shop, and demo lease documents for your active bay only."
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="border border-ink/10 bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Active leases</p>
          <p className="font-serif text-2xl font-semibold text-brand">{leases.length}</p>
        </div>
        <div className="border border-ink/10 bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Open tickets</p>
          <p className="font-serif text-2xl font-semibold text-brand">{openTickets}</p>
        </div>
        <div className="border border-ink/10 bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">Quick links</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold">
            <Link href="/portal/payments" className="text-terra hover:underline">Pay dues</Link>
            <Link href="/shop" className="text-terra hover:underline">Shop</Link>
          </div>
        </div>
      </div>
      <ul className="grid gap-2">
        {leases.map((lease) => (
          <li key={lease.applicationId} className="border border-ink/10 bg-card px-4 py-3 text-sm">
            <span className="font-semibold">{lease.propertyName} · Unit {lease.unitCode}</span>
            <span className="text-ink-soft"> · {lease.tenantName}</span>
            <StatusBadge status="approved" />
          </li>
        ))}
      </ul>
      <DoNextFaq
        steps={[
          { title: "File or track a ticket", body: "Open Tickets for maintenance or facility requests." },
          { title: "Pay what’s due", body: "Use Payments for rent, GST, and late fees (demo UPI / eNACH)." },
          { title: "Verify WhatsApp on Profile", body: "OTP stub keeps notices reachable — no live WhatsApp API." },
        ]}
        faqs={[
          { q: "Can I see other tenants’ data?", a: "No. The portal is scoped to your approved leases only." },
          { q: "Is shop checkout live Razorpay?", a: "Only when the landlord saved keys and left demo mode; otherwise checkout stays a demo stub." },
        ]}
      />
    </div>
  )
}
