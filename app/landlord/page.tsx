import Link from "next/link"
import { MoneyPair } from "@/components/money-pair"
import { ActionLink, PageHeader, StatCard } from "@/components/product"
import { listPortfolio, landlordOverview } from "@/lib/db"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Landlord" }

export default async function LandlordHome() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  const overview = landlordOverview(user.tenantId)
  const display = user.displayCurrency
  const properties = listPortfolio().filter((p) => p.tenantId === user.tenantId)
  const firstBuilding = properties[0]

  return (
    <div>
      <PageHeader
        kicker={user.tenantName ?? "L2 Landlord"}
        title="Portfolio overview"
        lede={
          display === "INR"
            ? "Run inventory, floor plans, and leasing ops. The USP is interactive floors — plan creator, CAD/PDF ingest, and 3D mesh binds."
            : `Display preference is ${display}. Charge currency stays INR — converted figures use the demo FX table.`
        }
        actions={
          <>
            <ActionLink href="/landlord/properties" variant="primary">
              Floors &amp; 3D
            </ActionLink>
            <ActionLink href="/landlord/listings" variant="secondary">
              Listings
            </ActionLink>
            <ActionLink href="/landlord/billing" variant="ghost">
              Billing
            </ActionLink>
          </>
        }
      />

      {/* USP strip — first-class floor creator entry */}
      <section
        className="mb-8 rounded-box border border-secondary/30 bg-gradient-to-br from-secondary/10 via-base-100 to-base-200 p-5"
        data-testid="landlord-floor-usp"
        aria-label="Floor and 3D visualizer"
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary">
          Main USP · Floors · CAD · 3D
        </p>
        <h2 className="mt-1 font-serif text-xl font-semibold text-primary md:text-2xl">
          Build the building visitors can walk.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-soft">
          Draft orthogonal plates, ingest CAD/PDF, bind 3D meshes, and pin Matterport tours — then
          publish bays to the public catalogue.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/landlord/properties" className="btn btn-primary btn-sm rounded-sm">
            Open buildings
          </Link>
          {firstBuilding ? (
            <>
              <Link
                href={`/landlord/properties/${firstBuilding.id}#plan-creator`}
                className="btn btn-secondary btn-sm rounded-sm"
              >
                Plan creator
              </Link>
              <Link
                href={`/landlord/properties/${firstBuilding.id}#cad-ingest`}
                className="btn btn-outline btn-sm rounded-sm"
              >
                CAD / PDF ingest
              </Link>
              <Link
                href={`/landlord/properties/${firstBuilding.id}#building-3d`}
                className="btn btn-ghost btn-sm rounded-sm"
              >
                3D viewer
              </Link>
            </>
          ) : (
            <Link href="/landlord/properties/new" className="btn btn-secondary btn-sm rounded-sm">
              Add first property
            </Link>
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Occupancy" value={`${overview.occupancy}%`} href="/landlord/listings" />
        <StatCard
          label="Monthly rent roll"
          value={<MoneyPair inrMinor={overview.rentRollCents} display={display} />}
          href="/landlord/ledger"
        />
        <StatCard
          label="Applications in review"
          value={String(overview.openApplications)}
          href="/landlord/applications"
        />
        <StatCard
          label="Open concierge jobs"
          value={String(overview.openJobs)}
          href="/landlord/jobs"
        />
        <StatCard
          label="Open ledger balance"
          value={<MoneyPair inrMinor={overview.dueCents} display={display} />}
          href="/landlord/ledger"
        />
        <StatCard
          label="Bays leased"
          value={`${overview.leasedCount}/${overview.unitCount}`}
          href="/landlord/properties"
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <ActionLink href="/landlord/applications" variant="secondary">
          Review applications
        </ActionLink>
        <ActionLink href="/landlord/visits" variant="ghost">
          Confirm visits
        </ActionLink>
        <ActionLink href="/landlord/ask" variant="ghost">
          Ask Easy
        </ActionLink>
        <ActionLink href="/pricing" variant="accent">
          Plans &amp; subscribe
        </ActionLink>
      </div>
    </div>
  )
}
