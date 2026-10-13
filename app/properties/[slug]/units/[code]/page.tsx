import Link from "next/link"
import { notFound } from "next/navigation"
import { UnitGallery } from "@/components/gallery/unit-gallery"
import { SpecList, StatusBadge } from "@/components/product"
import { getUnitPage } from "@/lib/db"
import { money, monthlyRentCents, rateLabel, sqft } from "@/lib/format"

export default async function UnitPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>
}) {
  const { slug, code } = await params
  const page = getUnitPage(slug, code)
  if (!page) notFound()
  const { property, unit, media } = page
  const monthly = monthlyRentCents(unit.ratePsf, unit.sqft)

  return (
    <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 md:px-8 lg:grid-cols-[1.3fr_0.7fr]">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">
          <Link href={`/properties/${property.slug}`} className="hover:underline">
            {property.name}
          </Link>
          {" · "}
          {property.tenantName}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">
            Unit {unit.code}
          </h1>
          <StatusBadge status={unit.status} />
        </div>
        <p className="mt-3 max-w-2xl text-ink-soft">{unit.description}</p>
        <div className="mt-6">
          <UnitGallery media={media} matterportUrl={unit.matterportUrl} />
        </div>
      </div>
      <aside className="h-fit border border-white/10 bg-brand p-6 text-paper lg:sticky lg:top-24">
        <p className="font-mono text-[11px] uppercase tracking-wider text-white/55">
          {property.address}
        </p>
        <p className="mt-4 font-serif text-3xl font-semibold text-[#9ed0e0]">
          ₹{rateLabel(unit.ratePsf)}{" "}
          <small className="font-mono text-xs font-normal text-white/50">/ SF · month</small>
        </p>
        <p className="mt-1 text-sm text-white/70">{money(monthly)} per month, before GST.</p>
        <div className="mt-4 text-paper [&_dt]:text-white/60">
          <SpecList
            rows={[
              { label: "Area", value: sqft(unit.sqft) },
              { label: "Clear height", value: unit.clearHeight },
              { label: "Docks", value: String(unit.docks) },
              { label: "Drive-in", value: String(unit.driveIns) },
              { label: "Power", value: unit.power },
            ]}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {unit.status === "leased" ? (
            <p className="text-sm text-white/70">
              This bay is leased. Browse the floor plan for an open one.
            </p>
          ) : (
            <Link
              href={`/apply/${unit.id}`}
              className="bg-terra px-4 py-3 font-serif text-sm font-bold text-white transition-colors hover:bg-terra-dark"
            >
              Apply for this bay
            </Link>
          )}
          <Link
            href={`/properties/${property.slug}`}
            className="border border-white/30 px-4 py-3 font-serif text-sm font-bold transition-colors hover:border-white"
          >
            Back to the plan
          </Link>
        </div>
      </aside>
    </div>
  )
}
