/** Landlord org seat roles (PRD §3.2 / §8.1). */

export type SeatRole = "owner" | "leasing_manager" | "accountant" | "viewer"

export const SEAT_ROLES: SeatRole[] = ["owner", "leasing_manager", "accountant", "viewer"]

export function isSeatRole(value: string): value is SeatRole {
  return (SEAT_ROLES as string[]).includes(value)
}

export function seatRoleLabel(role: SeatRole): string {
  if (role === "owner") return "Owner"
  if (role === "leasing_manager") return "Leasing manager"
  if (role === "accountant") return "Accountant"
  return "Viewer"
}

export type SeatCapabilities = {
  /** Open landlord desk at all */
  openDesk: boolean
  manageListings: boolean
  manageApplications: boolean
  manageJobs: boolean
  manageProviders: boolean
  manageLedger: boolean
  manageSettings: boolean
  inviteSeats: boolean
  changePackage: boolean
}

const SEAT_CAPS: Record<SeatRole, SeatCapabilities> = {
  owner: {
    openDesk: true,
    manageListings: true,
    manageApplications: true,
    manageJobs: true,
    manageProviders: true,
    manageLedger: true,
    manageSettings: true,
    inviteSeats: true,
    changePackage: true,
  },
  leasing_manager: {
    openDesk: true,
    manageListings: true,
    manageApplications: true,
    manageJobs: true,
    manageProviders: true,
    manageLedger: false,
    manageSettings: false,
    inviteSeats: false,
    changePackage: false,
  },
  accountant: {
    openDesk: true,
    manageListings: false,
    manageApplications: false,
    manageJobs: false,
    manageProviders: false,
    manageLedger: true,
    manageSettings: true,
    inviteSeats: false,
    changePackage: false,
  },
  viewer: {
    openDesk: true,
    manageListings: false,
    manageApplications: false,
    manageJobs: false,
    manageProviders: false,
    manageLedger: false,
    manageSettings: false,
    inviteSeats: false,
    changePackage: false,
  },
}

export function seatCapabilities(role: SeatRole | null | undefined): SeatCapabilities | null {
  if (!role) return null
  return SEAT_CAPS[role]
}

/** Seeded / legacy landlord_admin without a seat row → treat as owner. */
export function effectiveSeatRole(
  userRole: string,
  seatRole: SeatRole | null | undefined,
): SeatRole | null {
  if (seatRole) return seatRole
  if (userRole === "landlord_admin") return "owner"
  return null
}
