import Link from "next/link"
import { notFound } from "next/navigation"
import { PageHeader } from "@/components/product"
import { BookSlotForm } from "@/components/visits/book-slot-form"
import { getSessionUser } from "@/lib/session"
import {
  appointmentTypesForProperty,
  getPropertyVisitContext,
  listOpenSlots,
  prefillGuest,
} from "@/lib/visits"

export const metadata = { title: "Book a visit" }

export default async function BookVisitPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ unit?: string; notice?: string }>
}) {
  const { slug } = await params
  const query = await searchParams
  const property = getPropertyVisitContext(slug)
  if (!property) notFound()

  const user = await getSessionUser()
  const defaults = prefillGuest(user)
  const types = appointmentTypesForProperty(property.id)
  const slotsByType: Record<string, ReturnType<typeof listOpenSlots>> = {}
  for (const type of types) {
    slotsByType[type.id] = listOpenSlots(property.id, type.id)
  }

  let unitId: string | null = null
  if (query.unit) {
    const { getUnitPage } = await import("@/lib/db")
    const page = getUnitPage(slug, query.unit)
    unitId = page?.unit.id ?? null
  }

  return (
    <div className="mx-auto max-w-[720px] px-4 py-10 md:px-8">
      <PageHeader
        kicker={property.tenantName}
        title={`Book a visit · ${property.name}`}
        lede={`${property.address}. Choose in-person or virtual, pick an open IST slot, and the landlord confirms from their visits desk.`}
      />
      {query.notice ? (
        <p
          className="mb-6 border border-avail/30 bg-avail/10 px-4 py-3 text-sm text-[#1f6b38]"
          role="status"
        >
          {query.notice}
        </p>
      ) : null}
      {!property.visitsEnabled ? (
        <p className="text-sm text-ink-soft">
          Visit booking is turned off for this property.{" "}
          <Link href={`/properties/${property.slug}`} className="font-bold text-brand underline">
            Back to the property
          </Link>
        </p>
      ) : (
        <BookSlotForm
          propertyId={property.id}
          unitId={unitId}
          types={types}
          slotsByType={slotsByType}
          defaults={defaults}
        />
      )}
      <p className="mt-8 text-sm">
        <Link href={`/properties/${property.slug}`} className="font-bold text-brand underline">
          Back to {property.name}
        </Link>
      </p>
    </div>
  )
}
