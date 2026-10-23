import { ImportListingForm } from "@/components/listings/import-listing-form"
import { PageHeader } from "@/components/product"
import { LISTING_SITES } from "@/lib/import/listing-schema"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Import listing" }

export default async function LandlordImportPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  return (
    <div>
      <PageHeader
        kicker="Listings"
        title="Import listing"
        lede="Pull public fields from a pre-identified India or Canada listing URL into a draft bay for this organisation."
      />
      <ImportListingForm
        sites={LISTING_SITES}
        tenantId={user.tenantId}
        propertiesHref="/landlord/properties"
        propertyDetailPrefix="/landlord/properties"
      />
    </div>
  )
}
