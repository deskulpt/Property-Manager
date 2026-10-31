import Link from "next/link"
import { DoNextFaq } from "@/components/cms/do-next-faq"
import { ListingEditor } from "@/components/listings/listing-editor"
import { ErrorBanner, NoticeBanner, PageHeader } from "@/components/product"
import { listPortfolio } from "@/lib/db"
import { listingRowsForTenant } from "@/lib/role-cms-store"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Listings" }

export default async function LandlordListingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ notice?: string; error?: string }>
}) {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const params = (await searchParams) ?? {}
  const listings = listingRowsForTenant(user.tenantId)
  const properties = listPortfolio()
    .filter((p) => p.tenantId === user.tenantId)
    .map((p) => ({ id: p.id, name: p.name }))
  return (
    <div>
      <PageHeader
        kicker="Inventory"
        title="Listings"
        lede="Create, edit, publish, delist, or delete bays. Asking rent stays ₹/SF/month. Floors & 3D stay on the building desk."
        actions={
          <Link href="/landlord/properties" className="btn btn-secondary btn-sm rounded-sm">
            Floors &amp; 3D
          </Link>
        }
      />
      <NoticeBanner notice={params.notice} />
      <ErrorBanner message={params.error} />
      <ListingEditor listings={listings} properties={properties} allowDelete />
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
            title: "Keep floors current",
            body: "After CAD ingest or plan edits, confirm hotspots and 3D binds still match unit codes.",
          },
        ]}
        faqs={[
          {
            q: "Is asking rent stored in INR?",
            a: "Yes. Ledger and listings stay in Indian Rupees. NRI display currencies are view-only FX.",
          },
          {
            q: "Hide vs delist vs delete?",
            a: "Hide removes from public catalogue (listed=0). Delist also sets status hold. Delete permanently removes a non-leased unit with no open applications.",
          },
          {
            q: "Where do QR posters and floors live?",
            a: "Open Floors & 3D → a building for plan creator, CAD/PDF ingest, 3D, and QR posters.",
          },
        ]}
      />
    </div>
  )
}
