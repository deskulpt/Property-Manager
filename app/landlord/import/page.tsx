import { ImportListingForm } from "@/components/listings/import-listing-form"
import { PageHeader } from "@/components/product"
import { listingSitesForMarket } from "@/lib/import/listing-schema"
import { requestCountryIso } from "@/lib/markets/request-country"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Import listing" }

export default async function LandlordImportPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const iso = user.countryIso || user.tenantCountryIso || (await requestCountryIso())
  const sites = listingSitesForMarket(iso)
  return (
    <div>
      <PageHeader
        kicker="Listings"
        title="Import listing"
        lede={
          iso === "CA"
            ? "Ontario landlord-direct only — MLS, PropTx, and REALTOR.ca scrape/import paths are disabled. Kijiji classifieds remain for demo drafts."
            : "Pull public fields from a pre-identified India or Canada listing URL into a draft bay for this organisation."
        }
      />
      <ImportListingForm
        sites={sites}
        tenantId={user.tenantId}
        propertiesHref="/landlord/properties"
        propertyDetailPrefix="/landlord/properties"
      />
    </div>
  )
}
