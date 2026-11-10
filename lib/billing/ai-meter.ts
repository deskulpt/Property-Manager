/**
 * AI spend meter + hard caps scaffolding (CFO D02+D06 — DEMO/STUB).
 *
 * Per-tier allowance + overage; hard monthly caps per account and environment;
 * alert at 80%; downgrade to cheaper model at cap.
 * AI cost target ≤ 10–15% of tier revenue (advisory constant — not enforced billing).
 */

import type { PlanId } from "@/lib/plans"

export type AiModelTier = "cheap" | "standard" | "premium"

/** Monthly AI allowance in USD cents (demo catalogue). */
export const AI_ALLOWANCE_USD_CENTS: Record<PlanId, number> = {
  starter: 0,
  growth: 500, // $5
  pro: 2500, // $25
  enterprise: 15_000, // $150
}

/** Hard monthly AI spend cap per account (USD cents). */
export const AI_ACCOUNT_CAP_USD_CENTS: Record<PlanId, number> = {
  starter: 0,
  growth: 1_500,
  pro: 7_500,
  enterprise: 50_000,
}

/** Environment-wide hard cap (USD cents / calendar month). Override via env. */
export function environmentAiCapUsdCents(): number {
  const raw = process.env.AI_ENV_MONTHLY_CAP_USD_CENTS
  if (raw && /^\d+$/.test(raw)) return Number(raw)
  return 200_000 // $2,000 demo default
}

/** Advisory: AI cost should stay ≤ this share of tier revenue. */
export const AI_COST_REVENUE_BPS_MAX = 1500 // 15%
export const AI_COST_REVENUE_BPS_WARN = 1000 // 10%

export const AI_ALERT_THRESHOLD = 0.8

export type AiMeterSnapshot = {
  plan: PlanId
  allowanceUsdCents: number
  accountCapUsdCents: number
  envCapUsdCents: number
  accountSpentUsdCents: number
  envSpentUsdCents: number
  overageUsdCents: number
  accountUtilization: number
  envUtilization: number
  alert80Account: boolean
  alert80Env: boolean
  hardBlocked: boolean
  /** Model tier after cap downgrade policy */
  effectiveModelTier: AiModelTier
  labelledDemo: true
}

export function aiMeterSnapshot(input: {
  plan: PlanId
  accountSpentUsdCents: number
  envSpentUsdCents: number
  preferredTier?: AiModelTier
}): AiMeterSnapshot {
  const allowance = AI_ALLOWANCE_USD_CENTS[input.plan]
  const accountCap = AI_ACCOUNT_CAP_USD_CENTS[input.plan]
  const envCap = environmentAiCapUsdCents()
  const accountSpent = Math.max(0, Math.round(input.accountSpentUsdCents))
  const envSpent = Math.max(0, Math.round(input.envSpentUsdCents))
  const overage = Math.max(0, accountSpent - allowance)
  const accountUtil = accountCap > 0 ? accountSpent / accountCap : accountSpent > 0 ? 1 : 0
  const envUtil = envCap > 0 ? envSpent / envCap : envSpent > 0 ? 1 : 0
  const hardBlocked =
    (accountCap > 0 && accountSpent >= accountCap) || (envCap > 0 && envSpent >= envCap)
  const preferred = input.preferredTier ?? "standard"
  const effectiveModelTier: AiModelTier = hardBlocked
    ? "cheap"
    : accountUtil >= AI_ALERT_THRESHOLD
      ? preferred === "premium"
        ? "standard"
        : preferred === "standard"
          ? "cheap"
          : "cheap"
      : preferred

  return {
    plan: input.plan,
    allowanceUsdCents: allowance,
    accountCapUsdCents: accountCap,
    envCapUsdCents: envCap,
    accountSpentUsdCents: accountSpent,
    envSpentUsdCents: envSpent,
    overageUsdCents: overage,
    accountUtilization: accountUtil,
    envUtilization: envUtil,
    alert80Account: accountCap > 0 && accountUtil >= AI_ALERT_THRESHOLD && !hardBlocked,
    alert80Env: envCap > 0 && envUtil >= AI_ALERT_THRESHOLD && !hardBlocked,
    hardBlocked,
    effectiveModelTier,
    labelledDemo: true,
  }
}

/** True when AI spend share of revenue exceeds advisory band. */
export function aiCostShareExceedsTarget(
  aiSpendUsdCents: number,
  tierRevenueUsdCents: number,
  maxBps = AI_COST_REVENUE_BPS_MAX,
): boolean {
  if (tierRevenueUsdCents <= 0) return aiSpendUsdCents > 0
  return (aiSpendUsdCents * 10_000) / tierRevenueUsdCents > maxBps
}
