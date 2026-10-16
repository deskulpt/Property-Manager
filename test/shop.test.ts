import { beforeEach, describe, expect, it } from "vitest"
import { installTempDatabase } from "./helpers/temp-db"

installTempDatabase()

async function db() {
  return import("@/lib/db")
}

describe("occupant shop + Razorpay settings (Slice G)", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
  })

  it("seeds Extra Keys, FOB, Air Filters, tool kit, and service lift for BBM", async () => {
    const { listShopSkus } = await db()
    const skus = listShopSkus("t_bbm")
    const names = skus.map((s) => s.name)
    expect(names).toEqual([
      "Extra Keys",
      "FOB",
      "Air Filters",
      "Repair tool kit rental",
      "Service Lift Booking",
    ])
    expect(skus.filter((s) => s.kind === "rental")).toHaveLength(2)
  })

  it("Devon (lease) can buy Extra Keys via demo pay; order visible to BBM only", async () => {
    const {
      addToCart,
      checkoutCart,
      ordersForOccupant,
      ordersForTenant,
      getShopSettingsPublic,
    } = await db()

    const settings = getShopSettingsPublic("t_bbm")
    expect(settings.demoMode).toBe(true)
    expect(settings.hasSecret).toBe(false)

    const add = addToCart({
      userId: "u_devon",
      tenantId: "t_bbm",
      skuId: "sku_bbm_keys",
      qty: 1,
      slotStart: null,
    })
    expect(add.ok).toBe(true)

    const paid = checkoutCart({ userId: "u_devon", tenantId: "t_bbm", note: "spare set" })
    expect(paid.ok).toBe(true)
    if (!paid.ok) return
    expect(paid.paymentProvider).toBe("demo")
    expect(paid.labelledDemo).toBe(true)

    const devonOrders = ordersForOccupant("u_devon")
    expect(devonOrders.some((o) => o.id === paid.orderId)).toBe(true)

    const bbm = ordersForTenant("t_bbm")
    expect(bbm.some((o) => o.id === paid.orderId)).toBe(true)
    expect(ordersForTenant("t_harbour")).toHaveLength(0)
  })

  it("Maya without lease cannot add to cart", async () => {
    const { addToCart, leasesForOccupant } = await db()
    expect(leasesForOccupant("u_maya")).toHaveLength(0)
    const result = addToCart({
      userId: "u_maya",
      tenantId: "t_bbm",
      skuId: "sku_bbm_keys",
      qty: 1,
      slotStart: null,
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/occupants/i)
  })

  it("Service Lift double-book fails", async () => {
    const { addToCart, checkoutCart, forceBookRentalSlot } = await db()
    const slot = "2026-11-01T10:00:00.000Z"
    forceBookRentalSlot({
      tenantId: "t_bbm",
      skuId: "sku_bbm_lift",
      slotStart: slot,
      userId: "u_devon",
    })
    const add = addToCart({
      userId: "u_devon",
      tenantId: "t_bbm",
      skuId: "sku_bbm_lift",
      qty: 1,
      slotStart: slot,
    })
    expect(add.ok).toBe(false)

    const other = "2026-11-01T14:00:00.000Z"
    expect(
      addToCart({
        userId: "u_devon",
        tenantId: "t_bbm",
        skuId: "sku_bbm_lift",
        qty: 1,
        slotStart: other,
      }).ok,
    ).toBe(true)
    const paid = checkoutCart({ userId: "u_devon", tenantId: "t_bbm", note: "" })
    expect(paid.ok).toBe(true)
  })

  it("GET settings never includes raw Key Secret; last4 only after save", async () => {
    const { saveShopRazorpaySettings, getShopSettingsPublic, getShopSettingsInternal } =
      await db()
    const secret = "rzp_test_secret_ABCDEFGH"
    const publicAfter = saveShopRazorpaySettings("t_bbm", {
      keyId: "rzp_test_key123",
      keySecret: secret,
      demoMode: true,
      razorpayMode: "test",
      enabled: true,
    })
    expect(JSON.stringify(publicAfter)).not.toContain(secret)
    expect(publicAfter.hasSecret).toBe(true)
    expect(publicAfter.secretLast4).toBe("••••EFGH")
    expect(publicAfter.keyId).toBe("rzp_test_key123")

    const again = getShopSettingsPublic("t_bbm")
    expect(JSON.stringify(again)).not.toContain(secret)
    expect(again.secretLast4).toBe("••••EFGH")

    const internal = getShopSettingsInternal("t_bbm")
    expect(internal.secretEnc).toBeTruthy()
    expect(internal.secretEnc).not.toBe(secret)
  })

  it("with keys + demo off, checkout selects razorpay stub (still no live charge)", async () => {
    const { saveShopRazorpaySettings, addToCart, checkoutCart, clearCart } = await db()
    clearCart("u_devon", "t_bbm")
    saveShopRazorpaySettings("t_bbm", {
      keyId: "rzp_test_key123",
      keySecret: "supersecretvalue99",
      demoMode: false,
      razorpayMode: "test",
      enabled: true,
    })
    expect(
      addToCart({
        userId: "u_devon",
        tenantId: "t_bbm",
        skuId: "sku_bbm_fob",
        qty: 1,
        slotStart: null,
      }).ok,
    ).toBe(true)
    const paid = checkoutCart({ userId: "u_devon", tenantId: "t_bbm", note: "" })
    expect(paid.ok).toBe(true)
    if (!paid.ok) return
    expect(paid.paymentProvider).toBe("razorpay")
    expect(paid.labelledDemo).toBe(false)
    expect(paid.paymentRef.startsWith("rzp_order_stub_")).toBe(true)
  })

  it("Harbourline cannot list BBM SKUs via tenant-scoped query", async () => {
    const { listShopSkus } = await db()
    expect(listShopSkus("t_harbour")).toHaveLength(0)
    expect(listShopSkus("t_bbm").length).toBeGreaterThan(0)
  })
})
