import "server-only"

/**
 * Simulated document check. The score is a deterministic function of the
 * labels the person typed — not a biometric template, and not a call to
 * UIDAI or any other government API.
 */
export function simulateMatch(input: {
  country: string
  docType: string
  fileName: string
  faceName: string
}) {
  const named = input.fileName.trim().length > 0 && input.faceName.trim().length > 0
  if (!named) {
    return { score: 0.41, result: "review" as const }
  }
  let hash = 0
  const seed = `${input.country}|${input.docType}|${input.fileName}|${input.faceName}`
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  const score = Math.round((0.86 + (hash % 120) / 1000) * 100) / 100
  return { score, result: "match" as const }
}
