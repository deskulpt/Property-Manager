import Link from "next/link"
import { notFound } from "next/navigation"
import { FloorIngestPanel } from "@/components/floor/floor-ingest-panel"
import { PageHeader } from "@/components/product"
import { agentCanAccessTenant, resolveAgentTenantId } from "@/lib/agent-context"
import { propertyForLandlord } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Floor ingest · Managing agent" }

export default async function AgentPropertyFloorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getSessionUser()
  if (!user || user.role !== "managing_agent") return null
  const tenantId = await resolveAgentTenantId(user.id)
  if (!tenantId || !agentCanAccessTenant(user.id, tenantId)) {
    return (
      <PageHeader
        kicker="Portfolio"
        title="Select a landlord"
        lede="Choose a managed landlord context before ingesting floor plans."
      />
    )
  }
  const { id } = await params
  const property = propertyForLandlord(tenantId, id)
  if (!property) notFound()

  return (
    <div>
      <PageHeader
        kicker={property.area}
        title={property.name}
        lede="L3 property managers can ingest CAD/PDF floor plans for the active landlord organisation. Publish syncs the leasing plate and editable unit draft into the public floor viewer."
      />
      <p className="mb-6 text-sm">
        <Link href="/agent/listings" className="font-semibold text-terra hover:underline">
          ← Back to listings
        </Link>
      </p>
      <FloorIngestPanel
        propertyId={property.id}
        tenantId={tenantId}
        floors={property.floors.map((floor) => ({
          id: floor.id,
          label: floor.label,
          levelIndex: floor.levelIndex,
        }))}
        versions={property.mapVersions.map((version) => ({
          id: version.id,
          status: version.status,
          sourceKind: version.sourceKind,
          sourceFilename: version.sourceFilename,
          platePath: version.platePath,
          createdAt: version.createdAt,
          publishedAt: version.publishedAt,
        }))}
        activeMapVersionId={property.activeMapVersionId}
      />
    </div>
  )
}
