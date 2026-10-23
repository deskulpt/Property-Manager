import { VisitInbox } from "@/components/landlord/visit-inbox"
import { PageHeader } from "@/components/product"
import { listPortfolio } from "@/lib/db"
import { getSessionUser } from "@/lib/session"
import {
  appointmentsForTenant,
  listOpenSlots,
  windowsForProperty,
} from "@/lib/visits"

export const metadata = { title: "Visits" }

export default async function LandlordVisitsPage() {
  const user = await getSessionUser()
  if (!user?.tenantId) return null

  const appointments = appointmentsForTenant(user.tenantId)
  const properties = listPortfolio()
    .filter((property) => property.tenantId === user.tenantId)
    .map((property) => ({
      id: property.id,
      name: property.name,
      area: property.area,
      slug: property.slug,
      visitsEnabled: property.visitsEnabled,
    }))

  const windows = properties.flatMap((property) =>
    windowsForProperty(property.id, user.tenantId!),
  )

  const openSlotsByAppointment: Record<string, ReturnType<typeof listOpenSlots>> = {}
  for (const appointment of appointments) {
    if (appointment.status !== "requested" && appointment.status !== "confirmed") continue
    openSlotsByAppointment[appointment.id] = listOpenSlots(
      appointment.propertyId,
      appointment.appointmentTypeId,
    ).filter((slot) => Date.parse(slot.startsAt) !== Date.parse(appointment.startsAt))
  }

  return (
    <div>
      <PageHeader
        kicker="Calendar"
        title="Visits"
        lede="Approve, decline, or reschedule tour requests. Weekly availability windows drive the public slot picker. The unit-page request form still works alongside this desk."
      />
      <VisitInbox
        appointments={appointments}
        properties={properties}
        windows={windows}
        openSlotsByAppointment={openSlotsByAppointment}
      />
    </div>
  )
}
