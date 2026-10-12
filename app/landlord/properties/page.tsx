import Link from "next/link"
import { PageHeader } from "@/components/product"
import { listPortfolio } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Properties" }

export default async function LandlordProperties() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const properties = listPortfolio().filter((property) => property.tenantId === user.tenantId)
  return (
    <div>
      <PageHeader kicker="Buildings" title="Your properties" lede="Open a building to upload a floor image and place bay pins. The public plan reads the same coordinates." />
      <div className="grid gap-3">
        {properties.map((property) => (
          <Link key={property.id} href={`/landlord/properties/${property.id}`} className="bg-card px-4 py-4 ring-1 ring-foreground/10">
            <h2 className="font-sans text-xl font-extrabold">{property.name}</h2>
            <p className="text-sm text-ink-soft">{property.address} · {property.area} · {property.units.length} bays</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
