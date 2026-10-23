import type { AppointmentStatus, AppointmentTypeCode } from "@/lib/format"

export type AppointmentTypeRecord = {
  id: string
  tenantId: string
  code: AppointmentTypeCode
  name: string
  durationMinutes: number
  bufferMinutes: number
  requiresMeetingUrl: boolean
}

export type AvailabilityWindowRecord = {
  id: string
  tenantId: string
  propertyId: string
  weekday: number
  startTime: string
  endTime: string
  timezone: string
}

export type AppointmentRecord = {
  id: string
  tenantId: string
  propertyId: string
  propertyName: string
  propertySlug: string
  unitId: string | null
  unitCode: string | null
  appointmentTypeId: string
  typeCode: AppointmentTypeCode
  typeName: string
  status: AppointmentStatus
  startsAt: string
  endsAt: string
  guestName: string
  guestEmail: string
  guestPhone: string
  notes: string
  meetingUrl: string | null
  applicantId: string | null
  replacesId: string | null
  createdAt: string
  updatedAt: string
}

export type VisitSlot = {
  startsAt: string
  endsAt: string
  label: string
}

/** Landlord visits desk property row (client-safe). */
export type VisitPropertySummary = {
  id: string
  name: string
  area: string
  slug: string
  visitsEnabled: boolean
}
