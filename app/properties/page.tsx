import Link from "next/link"
import { PageHeader, StatusBadge } from "@/components/product"
import { listPortfolio } from "@/lib/db"
import { sqft } from "@/lib/format"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Portfolio",
  description:
    "Industrial buildings on Easy Rental — open floor plans, unit pins, and Matterport tours where published.",
  path: "/properties",
})

/** Seed cover images by property slug for the portfolio mosaic. */
const COVERS: Record<string, string> = {
  waterman: "/media/gen-exterior.jpg",
  bartley: "/media/gen-office.jpg",
  cranfield: "/media/us-dock.jpg",
  commissioners: "/media/us-warehouse1.jpg",
  thane: "/media/gen-yard.jpg",
}

export default function PropertiesPage() {
  const portfolio = listPortfolio()
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-8">
      <PageHeader
        kicker="Public portfolio"
        title="Buildings you can walk."
        lede="Every landlord on Easy Rental publishes here. Open a floor plan, then a bay. Seeded organisations do not share a ledger."
      />
      <div className="grid gap-6 md:grid-cols-2">
        {portfolio.map((property, index) => {
          const available = property.units.filter((unit) => unit.status === "available").length
          const cover = COVERS[property.slug]
          const wide = index % 3 === 0
          return (
            <article
              key={property.id}
              className={`overflow-hidden border border-ink/10 bg-card ${wide ? "md:col-span-2 md:grid md:grid-cols-2" : ""}`}
            >
              <Link
                href={`/properties/${property.slug}`}
                className={`relative block bg-paper-3 ${wide ? "min-h-[240px]" : "aspect-[16/10]"}`}
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="blueprint-grid absolute inset-0 opacity-50" />
                )}
              </Link>
              <div className="p-5">
                <p className="font-mono text-[11px] uppercase tracking-wider text-terra">
                  {property.tenantName}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight">
                  <Link href={`/properties/${property.slug}`} className="hover:text-terra">
                    {property.name}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-ink-soft">{property.address}</p>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  {property.cityLine} · {available} available
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {property.units.map((unit) => (
                    <Link
                      key={unit.id}
                      href={`/properties/${property.slug}/units/${unit.code}`}
                      className="inline-flex items-center gap-2 border border-border px-2 py-1 text-sm transition-colors hover:border-terra hover:text-terra"
                    >
                      {unit.code}
                      <StatusBadge status={unit.status} />
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/properties/${property.slug}`}
                  className="mt-4 inline-block text-sm font-semibold text-terra hover:underline"
                >
                  Floor plan · {sqft(property.totalSqft)} →
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
