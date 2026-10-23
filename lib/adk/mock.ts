import type { AdkScope, AdkToolCall, AdkToolResult } from "@/lib/adk/types"

/**
 * Offline planner — mirrors adk-okf "Pure OKF" / common-knowledge path:
 * no LLM keys required; deterministic tool selection + extractive reply.
 */

export function planMockToolCalls(
  message: string,
  scope: AdkScope,
  propertyId?: string | null,
): AdkToolCall[] {
  const lower = message.toLowerCase().trim()
  if (!lower) return []

  if (scope === "public") {
    const area = detectArea(lower)
    const q = extractLooseQuery(lower) || area || ""
    return [
      {
        name: "search_listings",
        args: {
          ...(q ? { q } : {}),
          ...(area ? { area } : {}),
          status: "available",
        },
      },
    ]
  }

  // Landlord desk routing
  if (/\b(application|applicant|inbox|submitted|lease.?app)\b/.test(lower)) {
    return [{ name: "applications_summary", args: {} }]
  }

  if (
    /\b(availab|vacan|open bay|open unit|which unit|unit status|occupanc)\b/.test(lower)
  ) {
    return [
      {
        name: "unit_availability",
        args: {
          ...(propertyId ? { propertyId } : {}),
          q: extractLooseQuery(lower),
        },
      },
    ]
  }

  if (/\b(summar|portfolio|overview|occupanc|rent.?roll|how many|property)\b/.test(lower)) {
    return [
      {
        name: "property_summary",
        args: propertyId ? { propertyId } : {},
      },
    ]
  }

  if (/\b(search|find|list|listing|bay|warehouse|sqft|dock|bhiwandi|sriperumbudur|whitefield)\b/.test(lower)) {
    return [
      {
        name: "search_listings",
        args: { q: message.trim(), status: "available" },
      },
    ]
  }

  // Default landlord: property summary + availability for grounded desk demos
  return [
    { name: "property_summary", args: propertyId ? { propertyId } : {} },
    {
      name: "unit_availability",
      args: propertyId ? { propertyId } : {},
    },
  ]
}

function detectArea(lower: string): string | undefined {
  const areas: [string, string][] = [
    ["bhiwandi", "Bhiwandi"],
    ["whitefield", "Whitefield"],
    ["andheri", "Andheri East"],
    ["sriperumbudur", "Sriperumbudur"],
    ["thane", "Thane"],
  ]
  const hit = areas.find(([needle]) => lower.includes(needle))
  return hit?.[1]
}

function extractLooseQuery(lower: string): string {
  const stop = new Set([
    "what",
    "which",
    "show",
    "me",
    "the",
    "a",
    "an",
    "is",
    "are",
    "available",
    "availability",
    "units",
    "unit",
    "bays",
    "bay",
    "open",
    "vacant",
    "please",
    "for",
    "my",
    "our",
    "find",
    "search",
    "list",
    "listings",
    "warehouse",
    "over",
    "under",
    "with",
    "and",
    "in",
  ])
  return lower
    .split(/\W+/)
    .filter((w) => w.length > 2 && !stop.has(w))
    .slice(0, 4)
    .join(" ")
}

export function synthesizeMockReply(
  message: string,
  toolResults: AdkToolResult[],
): { reply: string; grounded: boolean } {
  const ok = toolResults.filter((r) => r.ok)
  if (ok.length === 0) {
    const err = toolResults.map((r) => r.error).filter(Boolean).join(" ")
    return {
      reply:
        err ||
        "I could not ground that against your portfolio. Try asking about availability, a property summary, or open applications.",
      grounded: false,
    }
  }

  const parts: string[] = []
  parts.push("Ask Easy (local mock — no API key). Grounded from tenant-scoped tools:")

  for (const result of ok) {
    parts.push(formatToolResult(result))
  }

  if (message.trim()) {
    parts.push(`Your question: “${message.trim().slice(0, 160)}”`)
  }

  return { reply: parts.join("\n\n"), grounded: true }
}

function formatToolResult(result: AdkToolResult): string {
  const data = result.data as Record<string, unknown> | undefined
  if (!data) return `• ${result.name}: (empty)`

  switch (result.name) {
    case "search_listings": {
      const listings = (data.listings as { property: string; unit: string; area: string; sqft: number; ratePsf: number; status: string }[]) ?? []
      if (listings.length === 0) return "• search_listings: no matching available units."
      const lines = listings.slice(0, 6).map(
        (l) =>
          `  – ${l.property} / Unit ${l.unit} · ${l.area} · ${l.sqft.toLocaleString()} SF @ ₹${l.ratePsf}/SF (${l.status})`,
      )
      return `• search_listings: ${data.count} match(es)\n${lines.join("\n")}`
    }
    case "property_summary": {
      if (data.property && typeof data.property === "object") {
        const p = data.property as {
          name: string
          area: string
          unitCount: number
          available: number
          leased: number
        }
        const portfolio = data.portfolio as { occupancy: number; openApplications: number; openJobs: number }
        return [
          `• property_summary: ${p.name} (${p.area}) — ${p.available} available / ${p.leased} leased of ${p.unitCount} units.`,
          `  Portfolio occupancy ${portfolio.occupancy}% · open apps ${portfolio.openApplications} · open jobs ${portfolio.openJobs}.`,
        ].join("\n")
      }
      const props = (data.properties as { name: string; area: string; available: number; units: number }[]) ?? []
      const portfolio = data.portfolio as { occupancy: number; unitCount: number; openApplications: number }
      const lines = props.map((p) => `  – ${p.name} (${p.area}): ${p.available}/${p.units} available`)
      return [
        `• property_summary: occupancy ${portfolio.occupancy}% across ${portfolio.unitCount} units · ${portfolio.openApplications} open applications.`,
        ...lines,
      ].join("\n")
    }
    case "unit_availability": {
      const units = (data.units as { property: string; code: string; status: string; sqft: number; ratePsf: number }[]) ?? []
      const lines = units.slice(0, 8).map(
        (u) =>
          `  – ${u.property} / ${u.code}: ${u.status} · ${u.sqft.toLocaleString()} SF @ ₹${u.ratePsf}/SF`,
      )
      return `• unit_availability: ${data.available} available of ${data.count} shown\n${lines.join("\n")}`
    }
    case "applications_summary": {
      const byStatus = data.byStatus as Record<string, number>
      const statusLine = Object.entries(byStatus)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ")
      const recent = (data.recent as { company: string; status: string; unit: string; property: string }[]) ?? []
      const lines = recent.slice(0, 5).map(
        (a) => `  – ${a.company} → ${a.property}/${a.unit} (${a.status})`,
      )
      return `• applications_summary: ${data.total} total (${statusLine || "none"})\n${lines.join("\n")}`
    }
    default:
      return `• ${result.name}: ${JSON.stringify(data).slice(0, 400)}`
  }
}
