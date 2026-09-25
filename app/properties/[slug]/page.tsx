import Link from "next/link"
import { notFound } from "next/navigation"
import { FloorPlanView } from "@/components/floor/floor-plan"
import { PageHeader, StatusBadge } from "@/components/product"
import { getPropertyBySlug } from "@/lib/db"
import { money, monthlyRentCents, rateLabel, sqft } from "@/lib/format"

export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const property = getPropertyBySlug(slug)
  if (!property) notFound()
  const markers = property.units
    .filter((unit) => unit.hotspotX != null && unit.hotspotY != null)
    .map((unit) => ({
      href: `/properties/${property.slug}/units/${unit.code}`,
      code: unit.code,
      x: unit.hotspotX as number,
      y: unit.hotspotY as number,
      status: unit.status,
    }))

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 md:px-8">
      <PageHeader
        kicker={property.tenantName}
        title={property.name}
        lede={`${property.address}. Click a pin to open that bay. Coordinates are stored on the unit, not drawn into the image.`}
      />
      <FloorPlanView src={property.floorPlanPath} alt={`Floor plan of ${property.name}`} markers={markers} />
      <div className="mt-4 flex flex-wrap gap-4 font-mono text-[11px] uppercase tracking-wider text-ink-soft">
        <span>Green · available</span>
        <span>Gold · pending</span>
        <span>Stone · leased</span>
      </div>
      <div className="mt-8 grid gap-3">
        {property.units.map((unit) => (
          <Link key={unit.id} href={`/properties/${property.slug}/units/${unit.code}`} className="flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-3 ring-1 ring-foreground/10">
            <span className="font-sans text-lg font-extrabold">Unit {unit.code}</span>
            <span className="text-sm text-ink-soft">{sqft(unit.sqft)} · ${rateLabel(unit.ratePsf)} / SF · {money(monthlyRentCents(unit.ratePsf, unit.sqft))} / mo</span>
            <StatusBadge status={unit.status} />
          </Link>
        ))}
      </div>
    </div>
  )
}
