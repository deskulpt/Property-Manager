/**
 * Subscription packages (PRD §7). Public ladder is Basic → Growth → Pro.
 * Code id `starter` is the Basic successor until a rename pass.
 */

export type SubscriptionPackage = "starter" | "growth" | "pro" | "enterprise"

export type PackageLimits = {
  id: SubscriptionPackage
  label: string
  /** Soft cap on active listed (published) properties — hard block at 100%. */
  maxProperties: number
  maxUnitsPerProperty: number
  maxSeats: number
  customDomain: boolean
  askEasy: boolean
}

export const PACKAGE_LIMITS: Record<SubscriptionPackage, PackageLimits> = {
  starter: {
    id: "starter",
    label: "Free",
    maxProperties: 50,
    maxUnitsPerProperty: 1,
    maxSeats: 2,
    customDomain: false,
    askEasy: false,
  },
  growth: {
    id: "growth",
    label: "Growth",
    maxProperties: 10,
    maxUnitsPerProperty: 80,
    maxSeats: 5,
    customDomain: false,
    askEasy: false,
  },
  pro: {
    id: "pro",
    label: "Pro",
    maxProperties: 50,
    maxUnitsPerProperty: 200,
    maxSeats: 15,
    customDomain: true,
    askEasy: true,
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    maxProperties: 10_000,
    maxUnitsPerProperty: 10_000,
    maxSeats: 500,
    customDomain: true,
    askEasy: true,
  },
}

export const DEFAULT_PACKAGE: SubscriptionPackage = "starter"

export function parsePackage(value: string | null | undefined): SubscriptionPackage {
  if (value === "growth" || value === "pro" || value === "enterprise" || value === "starter") {
    return value
  }
  // Legacy aliases from earlier drafts
  if (value === "basic") return "starter"
  if (value === "portfolio") return "pro"
  return DEFAULT_PACKAGE
}

export function packageLimits(pkg: SubscriptionPackage): PackageLimits {
  return PACKAGE_LIMITS[pkg]
}

/** Soft warn at 80% of a numeric cap. */
export function softWarn(used: number, max: number): boolean {
  if (max <= 0) return false
  return used / max >= 0.8 && used < max
}

export function hardBlocked(used: number, max: number): boolean {
  return used >= max
}
