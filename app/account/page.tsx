import Link from "next/link"
import { EmptyState, PageHeader, RoleGate, StatusBadge } from "@/components/product"
import { PhoneOtpForm } from "@/components/otp/phone-otp"
import { DataRightsPanel } from "@/components/privacy/data-rights"
import { applicationsForApplicant } from "@/lib/db"
import { formatDay } from "@/lib/format"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Applications" }

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>
}) {
  const user = await getSessionUser()
  const { notice } = await searchParams
  if (!user || user.role !== "applicant") {
    return (
      <RoleGate
        title="Applicant desk"
        body="Sign in as an applicant, or use the Demo identity switcher (Maya Chen or Devon Hale) when the demo switcher is enabled."
      />
    )
  }
  const applications = applicationsForApplicant(user.id)
  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <PageHeader
        kicker={user.company ?? "Applicant"}
        title={`${user.name.split(" ")[0]}’s applications`}
        lede="Status updates here when a landlord approves or declines. Verification, phone OTP, and the rent ledger live beside this list."
      />
      {notice ? <p className="mb-4 border border-brand/20 bg-accent px-4 py-3 text-sm text-brand" role="status">{notice}</p> : null}
      <div className="mb-6 flex flex-wrap gap-3 text-sm font-bold">
        <Link href="/account/verify" className="text-brand">Verification</Link>
        <Link href="/account/payments" className="text-brand">Payments</Link>
        <Link href="/shop" className="text-brand">Shop</Link>
        <Link href="/inbox" className="text-brand">Inbox</Link>
      </div>
      <section className="mb-8 bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="font-sans text-lg font-extrabold">Phone OTP (demo)</h2>
        <p className="mt-1 text-sm text-ink-soft">International E.164 numbers work — not only +91. No SMS provider in this demo.</p>
        <div className="mt-4">
          <PhoneOtpForm currentPhone={user.phone} />
        </div>
      </section>
      <div className="mb-8">
        <DataRightsPanel role={user.role} />
      </div>
      {applications.length === 0 ? (
        <EmptyState title="No applications yet" body="Open a bay from the portfolio and apply. Leased bays stay closed." action={{ href: "/properties", label: "Browse buildings" }} />
      ) : (
        <div className="grid gap-3">
          {applications.map((application) => (
            <article key={application.id} className="bg-card p-4 ring-1 ring-foreground/10">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-sans text-xl font-extrabold">
                  Unit {application.unitCode} · {application.propertyName}
                </h2>
                <StatusBadge status={application.status} />
              </div>
              <p className="mt-1 text-sm text-ink-soft">{application.intendedUse}</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint">{formatDay(application.createdAt.slice(0, 10))}</p>
              <Link href={`/properties/${application.propertySlug}/units/${application.unitCode}`} className="mt-3 inline-block text-sm font-bold text-brand">
                View the bay
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
