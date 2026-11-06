/**
 * Subscription packages — mirrors `lib/plans.ts` limits for auth/seat soft caps.
 * Money meter lives in `lib/billing/pricing.ts` (D01). Entitlements split per D02.
 */

import {
  PLAN_LIMITS,
  type PlanEntitlements,
  type PlanId,
  parsePlanId,
} from "@/lib/plans"

export type SubscriptionPackage = PlanId

export type PackageLimits = {
  id: SubscriptionPackage
  label: string
  /** Soft cap on active listed (published) properties — hard block at 100%. */
  maxProperties: number
  maxUnitsPerProperty: number
  maxSeats: number
  customDomain: boolean
  /** Legacy Ask Easy draft/propose gate (Pro+). Prefer entitlements. */
  askEasy: boolean
  entitlements: PlanEntitlements
}

export const PACKAGE_LIMITS: Record<SubscriptionPackage, PackageLimits> = {
  starter: {
    id: "starter",
    label: PLAN_LIMITS.starter.label,
    maxProperties: PLAN_LIMITS.starter.maxProperties,
    maxUnitsPerProperty: PLAN_LIMITS.starter.maxUnitsPerProperty,
    maxSeats: PLAN_LIMITS.starter.maxSeats,
    customDomain: PLAN_LIMITS.starter.customDomain,
    askEasy: PLAN_LIMITS.starter.askEasy,
    entitlements: PLAN_LIMITS.starter.entitlements,
  },
  growth: {
    id: "growth",
    label: PLAN_LIMITS.growth.label,
    maxProperties: PLAN_LIMITS.growth.maxProperties,
    maxUnitsPerProperty: PLAN_LIMITS.growth.maxUnitsPerProperty,
    maxSeats: PLAN_LIMITS.growth.maxSeats,
    customDomain: PLAN_LIMITS.growth.customDomain,
    askEasy: PLAN_LIMITS.growth.askEasy,
    entitlements: PLAN_LIMITS.growth.entitlements,
  },
  pro: {
    id: "pro",
    label: PLAN_LIMITS.pro.label,
    maxProperties: PLAN_LIMITS.pro.maxProperties,
    maxUnitsPerProperty: PLAN_LIMITS.pro.maxUnitsPerProperty,
    maxSeats: PLAN_LIMITS.pro.maxSeats,
    customDomain: PLAN_LIMITS.pro.customDomain,
    askEasy: PLAN_LIMITS.pro.askEasy,
    entitlements: PLAN_LIMITS.pro.entitlements,
  },
  enterprise: {
    id: "enterprise",
    label: PLAN_LIMITS.enterprise.label,
    maxProperties: PLAN_LIMITS.enterprise.maxProperties,
    maxUnitsPerProperty: PLAN_LIMITS.enterprise.maxUnitsPerProperty,
    maxSeats: PLAN_LIMITS.enterprise.maxSeats,
    customDomain: PLAN_LIMITS.enterprise.customDomain,
    askEasy: PLAN_LIMITS.enterprise.askEasy,
    entitlements: PLAN_LIMITS.enterprise.entitlements,
  },
}

export const DEFAULT_PACKAGE: SubscriptionPackage = "starter"

export function parsePackage(value: string | null | undefined): SubscriptionPackage {
  return parsePlanId(value)
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
