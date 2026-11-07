import { PageHeader } from "@/components/product"
import { CreatePropertyForm } from "@/components/landlord/create-property-form"
import { requestCountryIso } from "@/lib/markets/request-country"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "New property" }

export default async function NewPropertyPage() {
  const user = await getSessionUser()
  if (!user?.tenantId || user.role !== "landlord_admin") return null
  const countryIso = user.countryIso || user.tenantCountryIso || (await requestCountryIso())
  const ontario = countryIso === "CA"
  return (
    <div>
      <PageHeader
        kicker="Listings"
        title="Add a property"
        lede={
          ontario
            ? "Ontario RTA residential listings only. Landlord-direct; no commercial/sales; LMR deposit ≤ one month."
            : "Create a warehouse bay, commercial shop, or residential home. Segment controls rent basis, GST defaults, and the unit form."
        }
      />
      <CreatePropertyForm countryIso={countryIso} />
    </div>
  )
}
