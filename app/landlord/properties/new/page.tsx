import { PageHeader } from "@/components/product"
import { CreatePropertyForm } from "@/components/landlord/create-property-form"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "New property" }

export default async function NewPropertyPage() {
  const user = await getSessionUser()
  if (!user?.tenantId || user.role !== "landlord_admin") return null
  return (
    <div>
      <PageHeader
        kicker="Listings"
        title="Add a property"
        lede="Create a warehouse bay, commercial shop, or residential home. Segment controls rent basis, GST defaults, and the unit form."
      />
      <CreatePropertyForm />
    </div>
  )
}
