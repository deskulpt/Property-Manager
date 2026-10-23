import { beforeEach, describe, expect, it } from "vitest"
import { hashPassword, verifyPassword } from "@/lib/auth/password"
import { PACKAGE_LIMITS, hardBlocked, softWarn } from "@/lib/auth/packages"
import { seatCapabilities } from "@/lib/auth/seats"
import { useTempDatabase } from "./helpers/temp-db"

useTempDatabase()

async function db() {
  return import("@/lib/db")
}

describe("password hashing", () => {
  it("hashes and verifies with scrypt", () => {
    const hash = hashPassword("correct-horse-battery")
    expect(hash.startsWith("scrypt$")).toBe(true)
    expect(verifyPassword("correct-horse-battery", hash)).toBe(true)
    expect(verifyPassword("wrong-password", hash)).toBe(false)
  })
})

describe("package limits", () => {
  it("Basic (starter) hard-blocks at seat and property caps", () => {
    expect(PACKAGE_LIMITS.starter.maxSeats).toBe(2)
    expect(PACKAGE_LIMITS.starter.maxProperties).toBe(1)
    expect(softWarn(1, 2)).toBe(false)
    expect(softWarn(2, 2)).toBe(false)
    expect(hardBlocked(2, 2)).toBe(true)
    expect(hardBlocked(1, 2)).toBe(false)
  })

  it("Pro gates custom domain entitlement", () => {
    expect(PACKAGE_LIMITS.starter.customDomain).toBe(false)
    expect(PACKAGE_LIMITS.pro.customDomain).toBe(true)
  })
})

describe("seat role matrix", () => {
  it("viewer cannot mutate; leasing can apps; owner can invite", () => {
    expect(seatCapabilities("viewer")?.manageApplications).toBe(false)
    expect(seatCapabilities("leasing_manager")?.manageApplications).toBe(true)
    expect(seatCapabilities("leasing_manager")?.inviteSeats).toBe(false)
    expect(seatCapabilities("owner")?.inviteSeats).toBe(true)
    expect(seatCapabilities("accountant")?.manageLedger).toBe(true)
    expect(seatCapabilities("accountant")?.manageListings).toBe(false)
  })
})

describe("SaaS signup, invites, and isolation under seats", () => {
  beforeEach(async () => {
    const { closeDatabase, getDb } = await db()
    closeDatabase()
    getDb()
  })

  it("creates two India orgs that cannot read each other", async () => {
    const {
      createUserAccount,
      createLandlordOrg,
      propertyForLandlord,
      getDb,
      setPasswordHash,
    } = await db()
    const { hashPassword: hash } = await import("@/lib/auth/password")

    const a = createUserAccount({
      name: "Asha One",
      email: "asha@alpha.example",
      passwordHash: hash("password-a1"),
      role: "applicant",
    })
    expect(a.ok).toBe(true)
    if (!a.ok) return
    const orgA = createLandlordOrg({
      userId: a.userId,
      legalName: "Alpha Parks Pvt Ltd",
      city: "Pune",
      actingAs: "Director",
      entityType: "Private limited",
      contactName: "Asha One",
      contactEmail: "asha@alpha.example",
      packageId: "starter",
    })
    expect(orgA.ok).toBe(true)
    if (!orgA.ok) return

    const b = createUserAccount({
      name: "Bala Two",
      email: "bala@beta.example",
      passwordHash: hash("password-b2"),
      role: "applicant",
    })
    expect(b.ok).toBe(true)
    if (!b.ok) return
    const orgB = createLandlordOrg({
      userId: b.userId,
      legalName: "Beta Yards India",
      city: "Hyderabad",
      actingAs: "Partner",
      entityType: "LLP",
      contactName: "Bala Two",
      contactEmail: "bala@beta.example",
      packageId: "starter",
    })
    expect(orgB.ok).toBe(true)
    if (!orgB.ok) return

    // Seed a property on A only
    getDb()
      .prepare(
        `INSERT INTO properties (id, tenant_id, name, slug, address, area, city_line, total_sqft, floor_plan_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      )
      .run(
        "p_alpha_1",
        orgA.tenantId,
        "Alpha Shed",
        "alpha-shed",
        "1 Test Road, Pune 411001",
        "Pune",
        "PUNE · 10,000 SF",
        10000,
      )

    expect(propertyForLandlord(orgA.tenantId!, "p_alpha_1")?.slug).toBe("alpha-shed")
    expect(propertyForLandlord(orgB.tenantId!, "p_alpha_1")).toBeNull()
    expect(propertyForLandlord(orgA.tenantId!, "p_waterman")).toBeNull()

    // passwords set for login path coverage
    setPasswordHash(a.userId, hash("password-a1"))
    setPasswordHash(b.userId, hash("password-b2"))
  })

  it("rejects non-India country on createLandlordOrg via AuthProvider", async () => {
    const { createUserAccount } = await db()
    const { CredentialsAuthProvider } = await import("@/lib/auth/credentials-provider")
    const { hashPassword: hash } = await import("@/lib/auth/password")
    const user = createUserAccount({
      name: "Chris Abroad",
      email: "chris@abroad.example",
      passwordHash: hash("password12"),
      role: "applicant",
    })
    expect(user.ok).toBe(true)
    if (!user.ok) return
    const auth = new CredentialsAuthProvider()
    const denied = await auth.createOrg(user.userId, {
      legalName: "US Sheds LLC",
      city: "Austin",
      actingAs: "Owner",
      entityType: "LLC",
      contactName: "Chris Abroad",
      contactEmail: "chris@abroad.example",
      country: "United States",
    })
    expect(denied.ok).toBe(false)
  })

  it("invitee joins as leasing_manager; starter seat cap hard-blocks third seat", async () => {
    const {
      createUserAccount,
      createLandlordOrg,
      inviteOrgSeat,
      acceptOrgInvite,
      listSeats,
      getUser,
      canAttachSeat,
    } = await db()
    const { hashPassword: hash } = await import("@/lib/auth/password")

    const owner = createUserAccount({
      name: "Owner Seed",
      email: "owner@cap.example",
      passwordHash: hash("password12"),
      role: "applicant",
    })
    expect(owner.ok).toBe(true)
    if (!owner.ok) return
    const org = createLandlordOrg({
      userId: owner.userId,
      legalName: "Cap Test Parks",
      city: "Bengaluru",
      actingAs: "Director",
      entityType: "Pvt Ltd",
      contactName: "Owner Seed",
      contactEmail: "owner@cap.example",
      packageId: "starter",
    })
    expect(org.ok).toBe(true)
    if (!org.ok) return

    const invitee = createUserAccount({
      name: "Lease Mate",
      email: "lease@cap.example",
      passwordHash: hash("password12"),
      role: "applicant",
    })
    expect(invitee.ok).toBe(true)
    if (!invitee.ok) return

    const invite = inviteOrgSeat({
      tenantId: org.tenantId!,
      email: "lease@cap.example",
      seatRole: "leasing_manager",
      invitedByUserId: owner.userId,
    })
    expect(invite.ok).toBe(true)
    if (!invite.ok) return

    const accepted = acceptOrgInvite(invite.token, invitee.userId)
    expect(accepted.ok).toBe(true)

    const seats = listSeats(org.tenantId!)
    expect(seats).toHaveLength(2)
    expect(seats.find((s) => s.email === "lease@cap.example")?.seatRole).toBe("leasing_manager")

    const inviteeUser = getUser(invitee.userId)!
    expect(inviteeUser.seatRole).toBe("leasing_manager")
    expect(inviteeUser.tenantId).toBe(org.tenantId)

    // Starter maxSeats = 2 → hard block
    const gate = canAttachSeat(org.tenantId!)
    expect(gate.ok).toBe(false)

    const third = createUserAccount({
      name: "Third",
      email: "third@cap.example",
      passwordHash: hash("password12"),
      role: "applicant",
    })
    expect(third.ok).toBe(true)
    if (!third.ok) return
    const blocked = inviteOrgSeat({
      tenantId: org.tenantId!,
      email: "third@cap.example",
      seatRole: "viewer",
      invitedByUserId: owner.userId,
    })
    expect(blocked.ok).toBe(false)
  })

  it("duplicate email on same org rejected; seeded BBM property stays tenant-scoped", async () => {
    const { inviteOrgSeat, applicationsForTenant, propertyForLandlord } = await db()
    const dup = inviteOrgSeat({
      tenantId: "t_bbm",
      email: "nadia@demo.easyrent.example",
      seatRole: "viewer",
      invitedByUserId: "u_nadia",
    })
    expect(dup.ok).toBe(false)

    // No second seeded landlord on main — isolation is still tenant-id scoped.
    expect(applicationsForTenant("t_missing_org")).toHaveLength(0)
    expect(propertyForLandlord("t_missing_org", "p_waterman")).toBeNull()
    expect(propertyForLandlord("t_bbm", "p_waterman")?.slug).toBe("waterman")
  })

  it("password reset stub enqueues demo email row", async () => {
    const { listNotifications, setPasswordHash } = await db()
    const { CredentialsAuthProvider } = await import("@/lib/auth/credentials-provider")
    const { hashPassword: hash } = await import("@/lib/auth/password")
    setPasswordHash("u_maya", hash("maya-pass-1"))
    const auth = new CredentialsAuthProvider()
    const result = await auth.requestPasswordReset("maya@apexlogistics.example")
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.demo).toBe(true)
    const emails = listNotifications("u_maya", "email_demo")
    expect(emails.some((n) => n.title.includes("Password reset"))).toBe(true)
  })
})
