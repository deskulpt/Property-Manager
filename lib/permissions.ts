import { isStaffRole, type Role, type StaffRole } from "@/lib/format"

export type PersonaKind =
  | "platform_staff"
  | "landlords"
  | "applicants"
  | "providers"
  | "listings"
  | "markets"
  | "languages"
  | "referrals"

export type StaffCapabilities = {
  openCms: boolean
  personas: PersonaKind[]
  seeFullEmail: boolean
  seeMaskedEmail: boolean
  seeVerification: boolean
  seeLedger: boolean
  inviteLandlord: boolean
  verifyProvider: boolean
  approveProvider: boolean
  seeListingReadiness: boolean
  manageMarkets: boolean
  manageLanguages: boolean
  manageReferrals: boolean
}

const CAPS: Record<StaffRole, StaffCapabilities> = {
  super_admin: {
    openCms: true,
    personas: ["platform_staff", "landlords", "applicants", "providers", "listings", "markets", "languages", "referrals"],
    seeFullEmail: true,
    seeMaskedEmail: true,
    seeVerification: true,
    seeLedger: true,
    inviteLandlord: true,
    verifyProvider: true,
    approveProvider: true,
    seeListingReadiness: true,
    manageMarkets: true,
    manageLanguages: true,
    manageReferrals: true,
  },
  account_manager: {
    openCms: true,
    personas: ["landlords", "applicants", "referrals"],
    seeFullEmail: true,
    seeMaskedEmail: true,
    seeVerification: true,
    seeLedger: false,
    inviteLandlord: true,
    verifyProvider: false,
    approveProvider: false,
    seeListingReadiness: false,
    manageMarkets: false,
    manageLanguages: false,
    manageReferrals: true,
  },
  service_manager: {
    openCms: true,
    personas: ["providers"],
    seeFullEmail: true,
    seeMaskedEmail: true,
    seeVerification: false,
    seeLedger: false,
    inviteLandlord: false,
    verifyProvider: true,
    approveProvider: true,
    seeListingReadiness: false,
    manageMarkets: false,
    manageLanguages: false,
    manageReferrals: false,
  },
  property_manager: {
    openCms: true,
    personas: ["applicants", "listings"],
    seeFullEmail: false,
    seeMaskedEmail: true,
    seeVerification: false,
    seeLedger: false,
    inviteLandlord: false,
    verifyProvider: false,
    approveProvider: false,
    seeListingReadiness: true,
    manageMarkets: false,
    manageLanguages: false,
    manageReferrals: false,
  },
  merchandiser: {
    openCms: true,
    personas: ["listings"],
    seeFullEmail: false,
    seeMaskedEmail: false,
    seeVerification: false,
    seeLedger: false,
    inviteLandlord: false,
    verifyProvider: false,
    approveProvider: false,
    seeListingReadiness: true,
    manageMarkets: false,
    manageLanguages: false,
    manageReferrals: false,
  },
}

export function staffCapabilities(role: Role): StaffCapabilities | null {
  if (!isStaffRole(role)) return null
  return CAPS[role]
}

export function canOpenCms(role: Role) {
  return staffCapabilities(role)?.openCms === true
}

export function canListPersona(role: Role, kind: PersonaKind) {
  return staffCapabilities(role)?.personas.includes(kind) === true
}
