import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { UnitGallery } from "@/components/gallery/unit-gallery"
import { UnitSpecRows } from "@/components/listings/unit-specs"
import { PropertyMap } from "@/components/map/property-map"
import { StatusBadge } from "@/components/product"
import { JsonLd } from "@/components/seo/json-ld"
import { BookVisitForm } from "@/components/visits/book-visit-form"
import { getUnitPage } from "@/lib/db"
import { money, rateLabel, unitMonthlyRentCents } from "@/lib/format"
import { gstAppliesForUnit, leaseProfile, segmentLabel } from "@/lib/listing-schemas"
import { unitRealEstateListingJsonLd } from "@/lib/schema-org"
import { absoluteUrl, pageTitle } from "@/lib/seo"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; code: string }>
}): Promise<Metadata> {
  const { slug, code } = await params
  const page = getUnitPage(slug, code)
  if (!page) return { title: "Unit" }
  const { property, unit } = page
  return {
    title: pageTitle(`${property.name} · Unit ${unit.code}`),
    description: unit.description.slice(0, 160),
    alternates: {
      canonical: absoluteUrl(`/properties/${property.slug}/units/${unit.code}`),
    },
  }
}

export default async function UnitPage({
  params,
}: {
  params: Promise<{ slug: string; code: string }>
}) {
  const { slug, code } = await params
  const page = getUnitPage(slug, code)
  if (!page) notFound()
  const { property, unit, media } = page
  const monthly = unitMonthlyRentCents(unit)
  const profile = leaseProfile(property.segment)
  const showGst = gstAppliesForUnit({
    segment: property.segment,
    gstApplicable: unit.gstApplicable,
  })

  return (
    <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 md:px-8 lg:grid-cols-[1.3fr_0.7fr]">
      <JsonLd
        data={unitRealEstateListingJsonLd({
          property: {
            name: property.name,
            slug: property.slug,
            address: property.address,
            area: property.area,
            cityLine: property.cityLine,
            pinCode: property.pinCode,
            latitude: property.latitude,
            longitude: property.longitude,
            segment: property.segment,
            tenantName: property.tenantName,
          },
          unit,
        })}
      />
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-terra">
          <Link href={`/properties/${property.slug}`} className="hover:underline">
            {property.name}
          </Link>
          {" · "}
          {property.tenantName}
          {" · "}
          {segmentLabel(property.segment)}
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
        <div className="mt-10">
          <h2 className="font-serif text-xl font-semibold">Location</h2>
          <p className="mt-1 text-sm text-ink-soft">{property.address}</p>
          <div className="mt-4">
            <PropertyMap
              latitude={property.latitude}
              longitude={property.longitude}
              address={property.address}
              label={property.name}
              entranceLatitude={property.entranceLatitude}
              entranceLongitude={property.entranceLongitude}
              entranceLabel={property.entranceLabel}
              hideExactPin={property.hideExactPin}
            />
          </div>
        </div>
      </div>
      <aside className="h-fit border border-white/10 bg-brand p-6 text-paper lg:sticky lg:top-24">
        <p className="font-mono text-[11px] uppercase tracking-wider text-white/55">
          {property.address}
        </p>
        {unit.rateBasis === "flat_month" ? (
          <>
            <p className="mt-4 font-serif text-3xl font-semibold text-[#9ed0e0]">
              {money(monthly)}{" "}
              <small className="font-mono text-xs font-normal text-white/50">/ month</small>
            </p>
            <p className="mt-1 text-sm text-white/70">
              {showGst ? "Asking rent before GST." : "Residential asking rent — GST not applied in this demo."}
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 font-serif text-3xl font-semibold text-[#9ed0e0]">
              ₹{rateLabel(unit.ratePsf)}{" "}
              <small className="font-mono text-xs font-normal text-white/50">/ SF · month</small>
            </p>
            <p className="mt-1 text-sm text-white/70">
              {money(monthly)} per month{showGst ? ", before GST." : "."}
            </p>
          </>
        )}
        <div className="mt-4 text-paper [&_dt]:text-white/60">
          <UnitSpecRows
            segment={property.segment}
            attributes={unit.attributes}
            sqftValue={unit.sqft}
            clearHeight={unit.clearHeight}
            docks={unit.docks}
            driveIns={unit.driveIns}
            power={unit.power}
            carpetSqft={unit.carpetSqft}
            bhk={unit.bhk}
            securityDepositMonths={unit.securityDepositMonths}
            maintenanceMinor={unit.maintenanceMinor}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {unit.status === "leased" ? (
            <p className="text-sm text-white/70">
              This {profile.unitNoun} is leased. Browse the portfolio for an open one.
            </p>
          ) : (
            <Link
              href={`/apply/${unit.id}`}
              className="bg-terra px-4 py-3 font-serif text-sm font-bold text-white transition-colors hover:bg-terra-dark"
            >
              Apply for this {profile.unitNoun}
            </Link>
          )}
          <Link
            href={`/properties/${property.slug}`}
            className="border border-white/30 px-4 py-3 font-serif text-sm font-bold transition-colors hover:border-white"
          >
            Back to property
          </Link>
          {property.visitsEnabled ? (
            <Link
              href={`/properties/${property.slug}/book?unit=${unit.code}`}
              className="border border-white/30 px-4 py-3 font-serif text-sm font-bold transition-colors hover:border-white"
              data-testid="book-visit-unit"
            >
              Schedule visit
            </Link>
          ) : null}
        </div>
        <div className="mt-6">
          <BookVisitForm
            unitId={unit.id}
            unitCode={unit.code}
            propertyName={property.name}
          />
        </div>
      </aside>
    </div>
  )
}
