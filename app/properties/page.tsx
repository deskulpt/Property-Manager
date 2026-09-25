import Link from "next/link"
import { PageHeader, StatusBadge } from "@/components/product"
import { listPortfolio } from "@/lib/db"
import { sqft } from "@/lib/format"

export const metadata = { title: "Portfolio" }

export default function PropertiesPage() {
  const portfolio = listPortfolio()
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-8">
      <PageHeader
        kicker="Public portfolio"
        title="Buildings you can walk."
        lede="Every landlord on DeSkulpt publishes here. Open a floor plan, then a bay. The two seeded organisations do not share a ledger."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {portfolio.map((property) => {
          const available = property.units.filter((unit) => unit.status === "available").length
          return (
            <article key={property.id} className="bg-card p-5 ring-1 ring-foreground/10">
              <p className="font-mono text-[11px] uppercase tracking-wider text-terra">{property.tenantName}</p>
              <h2 className="mt-2 text-2xl font-extrabold">{property.name}</h2>
              <p className="mt-1 text-sm text-ink-soft">{property.address}</p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                {property.cityLine} · {available} available
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {property.units.map((unit) => (
                  <Link key={unit.id} href={`/properties/${property.slug}/units/${unit.code}`} className="inline-flex items-center gap-2 border border-border px-2 py-1 text-sm">
                    {unit.code}
                    <StatusBadge status={unit.status} />
                  </Link>
                ))}
              </div>
              <Link href={`/properties/${property.slug}`} className="mt-4 inline-block font-sans text-sm font-bold text-brand">
                Floor plan · {sqft(property.totalSqft)}
              </Link>
            </article>
          )
        })}
      </div>
    </div>
  )
}
