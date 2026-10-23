/** Partner & Service Network (§19C / Slice M) — shared types. */

export type PartnerTrack = "affiliate" | "service"

export type AffiliateSubtype = "realtor" | "architect" | "contractor"
export type ServiceSubtype = "plumber" | "electrician" | "cleaning" | "courier"
export type PartnerSubtype = AffiliateSubtype | ServiceSubtype

export type PartnerStatus =
  | "applied"
  | "docs_review"
  | "id_check"
  | "area_approval"
  | "active"
  | "suspended"
  | "rejected"

export type IdCheckResult = "pending" | "demo_verified" | "demo_failed"

export type PartnerReferralStatus = "new" | "invited" | "converted" | "discarded"

export const PARTNER_STATUSES: PartnerStatus[] = [
  "applied",
  "docs_review",
  "id_check",
  "area_approval",
  "active",
  "suspended",
  "rejected",
]

/** Happy-path advances only (CMS can jump with care). */
export const PARTNER_STATUS_NEXT: Partial<Record<PartnerStatus, PartnerStatus>> = {
  applied: "docs_review",
  docs_review: "id_check",
  id_check: "area_approval",
  area_approval: "active",
  suspended: "active",
}

export const AFFILIATE_SUBTYPES: AffiliateSubtype[] = ["realtor", "architect", "contractor"]
export const SERVICE_SUBTYPES: ServiceSubtype[] = [
  "plumber",
  "electrician",
  "cleaning",
  "courier",
]

export type PartnerServiceArea = {
  id: string
  applicationId: string
  citySlug: string | null
  pinPrefix: string | null
  radiusKm: number | null
  homeLat: number | null
  homeLng: number | null
  active: boolean
}

export type PartnerApplication = {
  id: string
  track: PartnerTrack
  subtype: PartnerSubtype
  status: PartnerStatus
  name: string
  phone: string
  email: string
  pan: string | null
  aadhaarLast4: string | null
  aadhaarConsentAt: string | null
  gstin: string | null
  licenceRef: string | null
  docsJson: string
  notesStaff: string
  idCheckResult: IdCheckResult
  demandOk: boolean
  userId: string | null
  createdAt: string
  updatedAt: string
  areas: PartnerServiceArea[]
}

export type PartnerReferral = {
  id: string
  referrerName: string
  referrerPhone: string
  referrerEmail: string
  referredName: string
  referredPhone: string
  referredEmail: string
  track: PartnerTrack
  subtype: PartnerSubtype
  city: string
  pin: string
  status: PartnerReferralStatus
  convertedApplicationId: string | null
  consentAt: string
  createdAt: string
}

export type PropertyGeo = {
  id: string
  name: string
  area: string
  pinCode: string | null
  latitude: number | null
  longitude: number | null
}
