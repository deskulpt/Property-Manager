import { beforeEach, describe, expect, it } from "vitest"
import { useTempDatabase } from "./helpers/temp-db"
import { authorizeFileParts } from "@/lib/files/access"

useTempDatabase()

async function bootDb() {
  const { closeDatabase, getDb, getUser } = await import("@/lib/db")
  closeDatabase()
  getDb()
  return { getUser }
}

describe("files route authz (CTO gate)", () => {
  beforeEach(async () => {
    await bootDb()
  })

  it("rejects anonymous reads", async () => {
    const decision = authorizeFileParts(null, ["t_bbm", "models", "x.glb"])
    expect(decision.ok).toBe(false)
    if (!decision.ok) expect(decision.status).toBe(401)
  })

  it("allows landlord to read own tenant object key", async () => {
    const { getUser } = await bootDb()
    const nadia = getUser("u_nadia")!
    const decision = authorizeFileParts(nadia, ["t_bbm", "models", "1234-abcd.glb"])
    expect(decision.ok).toBe(true)
  })

  it("denies cross-tenant object key (404, no leak)", async () => {
    const { getUser } = await bootDb()
    const nadia = getUser("u_nadia")!
    const decision = authorizeFileParts(nadia, ["t_harbour", "models", "1234-abcd.glb"])
    expect(decision.ok).toBe(false)
    if (!decision.ok) {
      expect(decision.status).toBe(404)
      expect(decision.reason).toBe("tenant_forbidden")
    }
  })

  it("allows managing agent with landlord access", async () => {
    const { getUser } = await bootDb()
    const riya = getUser("u_riya")!
    const decision = authorizeFileParts(riya, ["t_bbm", "floorplans", "plate.svg"])
    expect(decision.ok).toBe(true)
  })

  it("legacy flat uploads are staff-only", async () => {
    const { getUser } = await bootDb()
    const nadia = getUser("u_nadia")!
    const avery = getUser("u_avery")!
    expect(authorizeFileParts(nadia, ["orphan.glb"]).ok).toBe(false)
    expect(authorizeFileParts(avery, ["orphan.glb"]).ok).toBe(true)
  })

  it("esign stamps require envelope scope", async () => {
    const { getDb, getUser } = await import("@/lib/db")
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO esign_envelopes
        (id, tenant_id, lease_id, unit_id, occupant_id, document_name, status,
         signatory_name, signatory_email, signed_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      "env_test_1",
      "t_bbm",
      "lease_devon",
      "u_waterman_a1",
      "u_devon",
      "Lease.pdf",
      "completed",
      "Devon Hale",
      "devon@northline.example",
      "/files/esign/env_test_1.txt",
      now,
      now,
    )

    const nadia = getUser("u_nadia")!
    const devon = getUser("u_devon")!
    const maya = getUser("u_maya")!

    expect(authorizeFileParts(nadia, ["esign", "env_test_1.txt"]).ok).toBe(true)
    expect(authorizeFileParts(devon, ["esign", "env_test_1.txt"]).ok).toBe(true)
    expect(authorizeFileParts(maya, ["esign", "env_test_1.txt"]).ok).toBe(false)
    expect(authorizeFileParts(nadia, ["esign", "missing.txt"]).ok).toBe(false)
  })
})
