import Link from "next/link"
import { PageHeader } from "@/components/product"
import { listPortfolio } from "@/lib/db"
import { sqft } from "@/lib/format"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Properties" }

export default async function LandlordProperties() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const properties = listPortfolio().filter((property) => property.tenantId === user.tenantId)
  return (
    <div>
      <PageHeader
        kicker="Buildings"
        title="Your properties"
        lede="Open a building to upload a floor image and place bay pins. Print a QR poster for any bay — visitors scan to view and apply."
      />
      <div className="grid gap-4">
        {properties.map((property) => (
          <div key={property.id} className="bg-card px-4 py-4 ring-1 ring-foreground/10">
            <Link href={`/landlord/properties/${property.id}`} className="block">
              <h2 className="font-sans text-xl font-extrabold hover:text-terra">{property.name}</h2>
              <p className="text-sm text-ink-soft">
                {property.address} · {property.area} · {property.units.length} bays
              </p>
            </Link>
            <ul className="mt-3 grid gap-2 border-t border-ink/10 pt-3">
              {property.units.map((unit) => (
                <li
                  key={unit.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span>
                    <span className="font-semibold">Unit {unit.code}</span>
                    <span className="text-ink-soft"> · {sqft(unit.sqft)}</span>
                  </span>
                  <Link
                    href={`/landlord/poster/${unit.id}`}
                    className="font-semibold text-terra hover:underline"
                  >
                    Print QR poster
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
