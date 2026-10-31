import { describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"

installTempDatabase()

describe("country packs + promote", () => {
  it("seeds IN live and CA draft; promote CA wires live registry", async () => {
    const { listCountryPacks, promoteCountryPack, getLivePack, listLiveCountryPacks } =
      await import("@/lib/markets/store")
    const { CountryPackSchema } = await import("@/lib/markets/types")
    const { INDIA_PACK } = await import("@/lib/markets/packs")
    const { publicFormCountries } = await import("@/lib/db")
    const { activeMarket, setSessionMarketIso } = await import("@/lib/market")

    // Ensure schema + seed
    listCountryPacks()

    expect(CountryPackSchema.parse(INDIA_PACK).iso).toBe("IN")

    const packs = listCountryPacks()
    expect(packs.find((p) => p.iso === "IN")?.status).toBe("live")
    expect(packs.find((p) => p.iso === "CA")?.status).toBe("draft")

    expect(publicFormCountries().map((c) => c.iso)).toContain("IN")
    expect(listLiveCountryPacks().map((p) => p.iso)).toEqual(["IN"])

    const promoted = promoteCountryPack("CA")
    expect(promoted.ok).toBe(true)
    expect(listLiveCountryPacks().map((p) => p.iso).sort()).toEqual(["CA", "IN"])
    expect(getLivePack("CA").currency).toBe("CAD")

    setSessionMarketIso("CA")
    expect(activeMarket().currency).toBe("CAD")
    expect(activeMarket().phoneCountryCode).toBe("+1")
    setSessionMarketIso(null)
    expect(activeMarket().currency).toBe("INR")
  })

  it("rejects parked draft without allowParked", async () => {
    const { createMarketDraft } = await import("@/lib/db")
    const blocked = createMarketDraft({ isoCode: "US", name: "United States" })
    expect(blocked.ok).toBe(false)
    const allowed = createMarketDraft({
      isoCode: "US",
      name: "United States",
      allowParked: true,
    })
    expect(allowed.ok).toBe(true)
  })
})
