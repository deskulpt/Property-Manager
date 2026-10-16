import { PageHeader } from "@/components/product"
import { VisitCalendarStub } from "@/components/visits/visit-calendar-stub"
import { getSessionUser } from "@/lib/session"

export const metadata = { title: "Visits" }

export default async function LandlordVisitsPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null
  return (
    <div>
      <PageHeader
        kicker="Scheduling"
        title="Visit calendar"
        lede="Expand beyond the unit-page request form: availability windows, inbox actions, and conflict guards come next."
      />
      <VisitCalendarStub />
    </div>
  )
}
