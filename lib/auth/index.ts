export {
  isHosted,
  demoAuthAllowed,
  assertHostedAuthPolicy,
  authModeLabel,
} from "@/lib/auth/mode"
export { hashPassword, verifyPassword, randomToken } from "@/lib/auth/password"
export {
  PACKAGE_LIMITS,
  DEFAULT_PACKAGE,
  parsePackage,
  packageLimits,
  softWarn,
  hardBlocked,
  type SubscriptionPackage,
  type PackageLimits,
} from "@/lib/auth/packages"
export {
  SEAT_ROLES,
  isSeatRole,
  seatRoleLabel,
  seatCapabilities,
  effectiveSeatRole,
  type SeatRole,
  type SeatCapabilities,
} from "@/lib/auth/seats"
export {
  getAuthProvider,
  shouldShowDemoSwitcher,
  requireCredentialsPath,
  type AuthProvider,
  type OrgCreateInput,
  type InviteInput,
} from "@/lib/auth/provider"
