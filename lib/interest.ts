/**
 * Simple daily interest on overdue rent principal after grace (PRD §6.3).
 * Amounts are INR paise (minor units). Round half up for positive values.
 */
export function daysBetween(fromISO: string, toISO: string) {
  const [fy, fm, fd] = fromISO.split("-").map(Number)
  const [ty, tm, td] = toISO.split("-").map(Number)
  const from = Date.UTC(fy, fm - 1, fd)
  const to = Date.UTC(ty, tm - 1, td)
  return Math.floor((to - from) / 86_400_000)
}

/** Round half up to nearest integer paise. */
export function roundHalfUp(value: number) {
  if (value >= 0) return Math.floor(value + 0.5)
  return Math.ceil(value - 0.5)
}

/**
 * Cumulative simple interest: principal × (apr%/100) / 365 × days_overdue_after_grace.
 */
export function interestPaise(principalCents: number, aprPercent: number, daysOverdueAfterGrace: number) {
  if (principalCents <= 0 || aprPercent <= 0 || daysOverdueAfterGrace <= 0) return 0
  return roundHalfUp((principalCents * aprPercent * daysOverdueAfterGrace) / (100 * 365))
}
