import Link from "next/link"
import { PageHeader } from "@/components/product"
import { staffCapabilities } from "@/lib/permissions"
import { getSessionUser } from "@/lib/session"
import { roleLabel } from "@/lib/format"

export const metadata = { title: "CMS" }

export default async function CmsHomePage() {
  const user = await getSessionUser()
  if (!user) return null
  const caps = staffCapabilities(user.role)
  if (!caps) return null

  const cards = [
    caps.personas.includes("platform_staff")
      ? { href: "/cms/staff", title: "Platform staff", body: "DeSkulpt operators and their roles." }
      : null,
    caps.personas.includes("landlords")
      ? { href: "/cms/landlords", title: "Landlords", body: "Organisations and admin accounts. Invite a demo landlord." }
      : null,
    caps.personas.includes("applicants")
      ? { href: "/cms/applicants", title: "Applicants", body: "Prospects and occupants. Email may be masked for your role." }
      : null,
    caps.personas.includes("providers")
      ? { href: "/cms/providers", title: "Providers", body: "Verify trades and approve them for a landlord’s area." }
      : null,
    caps.personas.includes("listings")
      ? { href: "/cms/listings", title: "Listings readiness", body: "Floor plans, 360, and walkthrough coverage across the catalog." }
      : null,
    caps.personas.includes("markets")
      ? { href: "/cms/markets", title: "Next-market checklist", body: "Draft countries and finish every seam before they appear on public forms." }
      : null,
    caps.personas.includes("languages")
      ? { href: "/cms/languages", title: "Languages", body: "English source files. Add a language; translation waits without an API key." }
      : null,
  ].filter(Boolean) as { href: string; title: string; body: string }[]

  return (
    <div>
      <PageHeader
        kicker={roleLabel(user.role)}
        title="Persona CMS"
        lede="List and act on people and listings your role is allowed to see. Merchandisers never receive emails. Property Managers see masked applicant contacts."
      />
      <ul className="mb-6 grid gap-2 text-sm text-ink-soft">
        <li>Full email: {caps.seeFullEmail ? "yes" : "no"}</li>
        <li>Masked email: {caps.seeMaskedEmail ? "yes" : "no"}</li>
        <li>Verification scores: {caps.seeVerification ? "yes" : "no"}</li>
        <li>Invite landlords: {caps.inviteLandlord ? "yes" : "no"}</li>
        <li>Verify / approve providers: {caps.verifyProvider || caps.approveProvider ? "yes" : "no"}</li>
      </ul>
      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="desk-chrome border border-ink/10 bg-card p-5 transition-colors hover:border-terra/40"
          >
            <h2 className="font-serif text-xl font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-ink-soft">{card.body}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
