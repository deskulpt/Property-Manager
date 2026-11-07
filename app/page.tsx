import { CountryPicker } from "@/components/country/country-picker"
import { headers } from "next/headers"
import { listCountryPacks, listLiveCountryPacks } from "@/lib/markets/store"
import { BUILTIN_PACKS } from "@/lib/markets/packs"
import { normalizeMarketIso } from "@/lib/markets/cookie"

export const metadata = {
  title: "Choose your country · Easy Rental",
  description:
    "Pick India or Canada to open Easy Rental. We never auto-redirect from geo without your consent.",
  alternates: {
    canonical: "https://easyrental.space/",
  },
}

function suggestFromAcceptLanguage(header: string | null): string | null {
  if (!header) return null
  const lower = header.toLowerCase()
  if (lower.includes("en-ca") || lower.includes("fr-ca")) return "CA"
  if (lower.includes("en-in") || lower.includes("hi")) return "IN"
  return null
}

export default async function RootCountryPickerPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; suggest?: string }>
}) {
  const params = await searchParams
  const hdrs = await headers()
  const { ensureCountryPacksSchema } = await import("@/lib/markets/store")
  ensureCountryPacksSchema()
  const packs = listCountryPacks()
  const live = new Set(listLiveCountryPacks().map((p) => p.iso))

  const options = Object.values(BUILTIN_PACKS).map((pack) => {
    const row = packs.find((p) => p.iso === pack.iso)
    const status = (row?.status ?? "draft") as "live" | "draft" | "ready"
    return {
      iso: pack.iso,
      name: pack.name,
      currency: pack.currency,
      pathSegment: pack.pathSegment,
      status: live.has(pack.iso) ? ("live" as const) : status,
      blurb:
        pack.iso === "CA"
          ? `${pack.legalEntity} · CAD · Stripe Tax/HST gated · Connect DIRECT+PAD OFF`
          : `${pack.legalEntity} · INR · tax matrix gated · Razorpay OFF`,
    }
  })

  // Live packs first; CA may stay draft until promote — still listed for discoverability.
  options.sort((a, b) => {
    if (a.status === "live" && b.status !== "live") return -1
    if (b.status === "live" && a.status !== "live") return 1
    return a.name.localeCompare(b.name)
  })

  const suggest =
    (params.suggest ? normalizeMarketIso(params.suggest) : null) ||
    suggestFromAcceptLanguage(hdrs.get("accept-language")) ||
    hdrs.get("cf-ipcountry")?.toUpperCase() ||
    null

  const suggestedIso =
    suggest && options.some((o) => o.iso === normalizeMarketIso(suggest))
      ? normalizeMarketIso(suggest)
      : null

  return (
    <CountryPicker
      options={options}
      suggestedIso={suggestedIso}
      nextPath={params.next || "/"}
    />
  )
}
