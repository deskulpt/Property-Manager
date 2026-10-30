import { DoNextFaq } from "@/components/cms/do-next-faq"
import { AgreementStudioForm } from "@/components/agreements/agreement-studio"
import { EmptyState, PageHeader, RoleGate } from "@/components/product"
import { agentCanAccessTenant, listingRowsForTenant } from "@/lib/role-cms-store"
import { resolveAgentTenantId } from "@/lib/agent-context"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Agreement studio" }

export default async function AgreementNewPage() {
  const user = await getSessionUser()
  let tenantId: string | null = null
  let landlordName = ""
  if (user?.role === "landlord_admin" && user.tenantId) {
    tenantId = user.tenantId
    landlordName = user.tenantName ?? user.name
  } else if (user?.role === "managing_agent") {
    tenantId = await resolveAgentTenantId(user.id)
    if (!tenantId || !agentCanAccessTenant(user.id, tenantId)) {
      return <EmptyState title="Select a landlord" body="Managing agents pick a landlord context before drafting agreements." action={{ href: "/agent", label: "Open agent desk" }} />
    }
    landlordName = user.name
  } else {
    return (
      <RoleGate
        title="Agreement studio"
        body="Sign in as a landlord admin (Nadia / Jonah / Meera) or managing agent (Riya) to draft a standard India C&I rental agreement."
        action={{ href: "/login?next=/agreements/new", label: "Log in" }}
      />
    )
  }
  const listings = listingRowsForTenant(tenantId!)
  const units = listings.map((row) => ({
    id: row.id,
    code: row.code,
    propertyName: row.propertyName,
    propertyLabel: `${row.propertyName}, ${row.area}`,
    monthlyMajor: Math.round(row.monthlyCents / 100),
  }))
  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <PageHeader
        kicker="Demo · India C&I"
        title="Rental agreement studio"
        lede="Fill parties, rent (INR), deposit, and term. Generate a standard English agreement for download and demo e-sign / Aadhaar eSign stub."
      />
      {units.length === 0 ? (
        <EmptyState title="No units" body="Create a listing first." action={{ href: "/landlord/listings", label: "Listings" }} />
      ) : (
        <AgreementStudioForm units={units} landlordName={landlordName} />
      )}
      <DoNextFaq
        steps={[
          { title: "Complete the form", body: "Parties, unit, rent INR, deposit, and term are required." },
          { title: "Generate & download", body: "Open the packet page for a text download of the agreement body." },
          { title: "Demo e-sign", body: "Use pad stub or Aadhaar eSign stub — status moves to signed_demo." },
        ]}
        faqs={[
          { q: "Is this legal advice?", a: "No. It is a demo template for product walkthroughs." },
          { q: "Live DigiSigner / DigiLocker?", a: "Out of MVP. UI is labelled Demo." },
        ]}
      />
    </div>
  )
}
