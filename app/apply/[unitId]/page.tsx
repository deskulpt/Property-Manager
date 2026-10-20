import Link from "next/link"
import { notFound } from "next/navigation"
import { ApplyForm } from "@/components/apply-form"
import { PageHeader, RoleGate } from "@/components/product"
import { getDb } from "@/lib/db"
import { isPropertySegment, leaseProfile, type PropertySegment } from "@/lib/listing-schemas"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Apply" }

export default async function ApplyPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params
  const row = getDb().prepare(
    `SELECT u.id, u.code, u.status, p.name AS property_name, p.slug, p.segment, t.name AS tenant_name
     FROM units u JOIN properties p ON p.id = u.property_id JOIN tenants t ON t.id = u.tenant_id
     WHERE u.id = ?`,
  ).get(unitId) as
    | {
        id: string
        code: string
        status: string
        property_name: string
        slug: string
        segment: string
        tenant_name: string
      }
    | undefined
  if (!row) notFound()
  const segment: PropertySegment = isPropertySegment(row.segment) ? row.segment : "warehouse"
  const profile = leaseProfile(segment)
  const user = await getSessionUser()
  if (!user || user.role !== "applicant") {
    return (
      <RoleGate
        title="Switch to an applicant"
        body="Use the demo header and pick Maya Chen, Devon Hale, or Ravi Menon. Visitors can browse. Only an applicant identity can submit."
      />
    )
  }
  if (row.status === "leased") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <PageHeader
          kicker={row.tenant_name}
          title={`Unit ${row.code} is leased`}
          lede={`Pick another ${profile.unitNoun} on the property page.`}
        />
        <Link href={`/properties/${row.slug}`} className="font-sans font-bold text-brand">
          Back to {row.property_name}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <PageHeader
        kicker={`${row.tenant_name} · ${row.property_name}`}
        title={`Apply for Unit ${row.code}`}
        lede="This lands in that landlord’s inbox only. The other organisation will not see it."
      />
      <ApplyForm
        unitId={row.id}
        segment={segment}
        defaults={{
          company: user.company ?? "",
          contactName: user.name,
          email: user.email,
        }}
      />
    </div>
  )
}
