import { DoNextFaq } from "@/components/cms/do-next-faq"
import { ListingEditor } from "@/components/listings/listing-editor"
import { PageHeader } from "@/components/product"
import { listPortfolio } from "@/lib/db"
import { listingRowsForTenant } from "@/lib/role-cms-store"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Listings" }

export default async function LandlordListingsPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const listings = listingRowsForTenant(user.tenantId)
  const properties = listPortfolio()
    .filter((p) => p.tenantId === user.tenantId)
    .map((p) => ({ id: p.id, name: p.name }))
  return (
    <div>
      <PageHeader
        kicker="Inventory"
        title="Listings"
        lede="Create and edit bays, adjust asking rent in ₹/SF/month, and publish or hide from the public catalogue."
      />
      <ListingEditor listings={listings} properties={properties} />
      <DoNextFaq
        steps={[
          {
            title: "Review pending applications",
            body: "Open Applications and clear the pending queue before new enquiries pile up.",
          },
          {
            title: "Publish accurate pricing",
            body: "Set ₹/SF/month so public listings and agreement drafts stay consistent.",
          },
          {
            title: "Confirm today’s visits",
            body: "Check the visit calendar and confirm or decline requests.",
          },
        ]}
        faqs={[
          {
            q: "Is asking rent stored in INR?",
            a: "Yes. Ledger and listings stay in Indian Rupees. NRI display currencies are view-only FX.",
          },
          {
            q: "Who can see a hidden listing?",
            a: "Hidden units stay on your desk and floor plans but drop out of the public /listings catalogue.",
          },
          {
            q: "Where do QR posters live?",
            a: "Open Properties → a building → Print QR poster for any bay.",
          },
        ]}
      />
    </div>
  )
}
