import { beforeEach, describe, expect, it } from "vitest"
import { useTempDatabase } from "./helpers/temp-db"
import {
  anonymousSession,
  canInvokeTool,
  demoSession,
  invokeM0Tool,
  resolveMcpToken,
  toolsForSession,
} from "@/lib/mcp"

useTempDatabase()

async function bootDb() {
  const { closeDatabase, getDb } = await import("@/lib/db")
  closeDatabase()
  getDb()
}

describe("MCP M0 read-only tools", () => {
  beforeEach(async () => {
    await bootDb()
  })

  it("resolves demo PAT to landlord session with role_level 2", () => {
    const session = resolveMcpToken("demo:u_nadia")
    expect(session.userId).toBe("u_nadia")
    expect(session.role).toBe("landlord_admin")
    expect(session.roleLevel).toBe(2)
    expect(session.tenantId).toBe("t_bbm")
    expect(session.scopes).toContain("read:*")
  })

  it("advertises M0 reads for landlord; CMS tools stay staff-only", () => {
    const session = demoSession("u_nadia")
    const names = toolsForSession(session).map((t) => t.name)
    expect(names).toContain("query_portfolio_summary")
    expect(names).toContain("query_ledger_summary")
    expect(names).toContain("get_application_status")
    expect(names).toContain("search_listings")
    expect(names).not.toContain("cms_list_landlords")
    // M1 adds propose/approvals for landlord — covered in mcp-m1.test.ts
    expect(session.scopes).toContain("read:*")
  })

  it("landlord portfolio summary is tenant-scoped to BBM", () => {
    const session = demoSession("u_nadia")
    const result = invokeM0Tool(session, "query_portfolio_summary")
    expect(result.ok).toBe(true)
    const data = result.data as { tenantId: string; overview: { openApplications: number } }
    expect(data.tenantId).toBe("t_bbm")
    expect(data.overview.openApplications).toBeGreaterThan(0)
  })

  it("foreign landlord tenant cannot see BBM application by id (not_found)", () => {
    // Seed has a single demo landlord org; simulate another org via session claims only.
    const foreign = {
      userId: "u_foreign",
      role: "landlord_admin" as const,
      roleLevel: 2 as const,
      tenantId: "t_other_landlord",
      scopes: ["read:*"] as const,
      user: null,
    }
    const result = invokeM0Tool(foreign, "get_application_status", {
      applicationId: "app_maya",
    })
    expect(result.ok).toBe(false)
    expect(result.error).toBe("not_found")
  })

  it("rejects model-supplied foreign tenant_id", () => {
    const session = demoSession("u_nadia")
    const result = invokeM0Tool(session, "query_portfolio_summary", {
      tenant_id: "t_harbour",
    })
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/tenant_id may not be supplied/i)
  })

  it("applicant sees own application status; provider lists jobs", () => {
    const maya = demoSession("u_maya")
    expect(maya.roleLevel).toBe(4)
    const apps = invokeM0Tool(maya, "get_application_status")
    expect(apps.ok).toBe(true)
    const appData = apps.data as { applications: { id: string; status: string }[] }
    expect(appData.applications.some((a) => a.id === "app_maya")).toBe(true)

    const luis = demoSession("u_luis")
    expect(luis.roleLevel).toBe(5)
    expect(canInvokeTool(luis, "list_my_jobs")).toBe(true)
    const jobs = invokeM0Tool(luis, "list_my_jobs")
    expect(jobs.ok).toBe(true)
    expect((jobs.data as { count: number }).count).toBeGreaterThan(0)
  })

  it("anonymous may search listings but not portfolio or CMS", () => {
    const anon = anonymousSession()
    expect(canInvokeTool(anon, "search_listings")).toBe(true)
    expect(canInvokeTool(anon, "query_portfolio_summary")).toBe(false)
    expect(canInvokeTool(anon, "cms_list_landlords")).toBe(false)
    const search = invokeM0Tool(anon, "search_listings", { area: "Bhiwandi" })
    expect(search.ok).toBe(true)
    expect((search.data as { count: number }).count).toBeGreaterThan(0)
  })

  it("super admin CMS landlords works; merchandiser does not advertise landlords tool", () => {
    const avery = demoSession("u_avery")
    expect(avery.roleLevel).toBe(0)
    const ok = invokeM0Tool(avery, "cms_list_landlords")
    expect(ok.ok).toBe(true)
    expect((ok.data as { orgs: unknown[] }).orgs.length).toBeGreaterThan(0)

    const jordan = demoSession("u_jordan")
    expect(jordan.roleLevel).toBe(1)
    expect(canInvokeTool(jordan, "cms_list_landlords")).toBe(false)
    expect(toolsForSession(jordan).map((t) => t.name)).not.toContain("cms_list_landlords")
    const denied = invokeM0Tool(jordan, "cms_list_landlords")
    expect(denied.ok).toBe(false)
  })

  it("referral status returns empty pipeline stub (no mutate)", () => {
    const session = demoSession("u_nadia")
    const result = invokeM0Tool(session, "query_referral_status")
    expect(result.ok).toBe(true)
    const data = result.data as { available: boolean; indications: unknown[] }
    expect(data.available).toBe(false)
    expect(data.indications).toEqual([])
  })

  it("occupant ledger summary is self-scoped for Devon", () => {
    const devon = demoSession("u_devon")
    const result = invokeM0Tool(devon, "query_ledger_summary")
    expect(result.ok).toBe(true)
    const data = result.data as { scope: string; userId: string; dueCount: number }
    expect(data.scope).toBe("occupant_self")
    expect(data.userId).toBe("u_devon")
    expect(data.dueCount).toBeGreaterThanOrEqual(0)
  })
})
