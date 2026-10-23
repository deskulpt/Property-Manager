import {
  applicationsForApplicant,
  applicationsForTenant,
  cmsApplicants,
  cmsLandlords,
  cmsProviders,
  getUser,
  jobsForProvider,
  landlordOverview,
  ledgerForTenant,
  ledgerForUser,
  searchListings,
  type SessionUser,
} from "@/lib/db"
import { sessionFromUser, type McpSession } from "@/lib/mcp/session"

/** M0 read-only tool names — see docs/role-actions-mcp-surface.md §5. */
export type McpM0ToolName =
  | "search_listings"
  | "query_portfolio_summary"
  | "query_ledger_summary"
  | "get_application_status"
  | "query_referral_status"
  | "list_my_jobs"
  | "cms_list_landlords"
  | "cms_list_applicants"
  | "cms_list_providers"

export type McpToolResult = {
  ok: boolean
  tool: McpM0ToolName
  error?: string
  data?: unknown
}

export type McpToolSpec = {
  name: McpM0ToolName
  description: string
  mutating: false
  /** Role levels that may invoke this tool. null level = anonymous. */
  roleLevels: ReadonlyArray<number | null>
}

export const MCP_M0_TOOLS: readonly McpToolSpec[] = [
  {
    name: "search_listings",
    description: "Search available listings (public catalog or landlord tenant-scoped).",
    mutating: false,
    roleLevels: [null, 0, 1, 2, 3, 4, 5],
  },
  {
    name: "query_portfolio_summary",
    description: "Landlord portfolio rollup: occupancy, rent roll, open apps/jobs, ledger due.",
    mutating: false,
    roleLevels: [2, 3],
  },
  {
    name: "query_ledger_summary",
    description: "Ledger summary for the session landlord org or the signed-in occupant.",
    mutating: false,
    roleLevels: [2, 4],
  },
  {
    name: "get_application_status",
    description: "Application status for the applicant (own) or landlord (tenant inbox).",
    mutating: false,
    roleLevels: [2, 3, 4],
  },
  {
    name: "query_referral_status",
    description: "Refer & Earn pipeline status for the session user (empty until Slice J on main).",
    mutating: false,
    roleLevels: [0, 1, 2, 3, 4, 5],
  },
  {
    name: "list_my_jobs",
    description: "Concierge jobs assigned to the signed-in service provider.",
    mutating: false,
    roleLevels: [5],
  },
  {
    name: "cms_list_landlords",
    description: "CMS landlord org directory (platform staff).",
    mutating: false,
    roleLevels: [0, 1],
  },
  {
    name: "cms_list_applicants",
    description: "CMS applicants list with role-based email masking.",
    mutating: false,
    roleLevels: [0, 1],
  },
  {
    name: "cms_list_providers",
    description: "CMS service-provider directory.",
    mutating: false,
    roleLevels: [0, 1],
  },
] as const

function staffSeatAllows(session: McpSession, name: McpM0ToolName): boolean {
  const role = session.role
  if (name === "cms_list_landlords") {
    return role === "super_admin" || role === "account_manager"
  }
  if (name === "cms_list_applicants") {
    return role === "super_admin" || role === "account_manager" || role === "property_manager"
  }
  if (name === "cms_list_providers") {
    return role === "super_admin" || role === "service_manager"
  }
  return true
}

export function toolsForSession(session: McpSession): McpToolSpec[] {
  return MCP_M0_TOOLS.filter(
    (t) => t.roleLevels.includes(session.roleLevel) && staffSeatAllows(session, t.name),
  )
}

export function canInvokeTool(session: McpSession, name: string): boolean {
  const spec = MCP_M0_TOOLS.find((t) => t.name === name)
  if (!spec) return false
  if (spec.mutating) return false
  if (!spec.roleLevels.includes(session.roleLevel)) return false
  return staffSeatAllows(session, spec.name)
}

/**
 * Invoke an M0 tool. Rejects unknown / mutating / unauthorized tools.
 * Ignores any client-supplied tenant_id — isolation uses session only.
 */
export function invokeM0Tool(
  session: McpSession,
  name: string,
  args: Record<string, unknown> = {},
): McpToolResult {
  if (!MCP_M0_TOOLS.some((t) => t.name === name)) {
    return { ok: false, tool: name as McpM0ToolName, error: `Unknown tool: ${name}` }
  }
  const tool = name as McpM0ToolName
  if (!canInvokeTool(session, tool)) {
    return {
      ok: false,
      tool,
      error: `Tool not available for role_level=${session.roleLevel ?? "anonymous"} (${session.role}).`,
    }
  }
  // Hard refuse any model-supplied tenant override.
  if ("tenant_id" in args || "tenantId" in args) {
    const supplied = args.tenant_id ?? args.tenantId
    if (supplied != null && supplied !== session.tenantId) {
      return {
        ok: false,
        tool,
        error: "tenant_id may not be supplied by the model; use session claims.",
      }
    }
  }

  switch (tool) {
    case "search_listings":
      return toolSearchListings(session, args)
    case "query_portfolio_summary":
      return toolPortfolioSummary(session)
    case "query_ledger_summary":
      return toolLedgerSummary(session)
    case "get_application_status":
      return toolApplicationStatus(session, args)
    case "query_referral_status":
      return toolReferralStatus(session)
    case "list_my_jobs":
      return toolListMyJobs(session)
    case "cms_list_landlords":
      return toolCmsLandlords(session)
    case "cms_list_applicants":
      return toolCmsApplicants(session)
    case "cms_list_providers":
      return toolCmsProviders(session)
    default:
      return { ok: false, tool, error: `Unhandled tool: ${tool}` }
  }
}

function requireActor(session: McpSession): SessionUser | McpToolResult {
  if (!session.user) {
    return {
      ok: false,
      tool: "cms_list_landlords",
      error: "Authentication required.",
    }
  }
  return session.user
}

function toolSearchListings(session: McpSession, args: Record<string, unknown>): McpToolResult {
  const q = typeof args.q === "string" ? args.q : undefined
  const area = typeof args.area === "string" ? args.area : undefined
  const status =
    args.status === "available" || args.status === "leased" || args.status === "hold" || args.status === "pending"
      ? args.status
      : "available"

  // Landlord / managing agent: force session tenant. Public / applicant / staff: catalog.
  const tenantScoped = session.roleLevel === 2 || session.roleLevel === 3
  if (tenantScoped && !session.tenantId) {
    return { ok: false, tool: "search_listings", error: "Session tenant required." }
  }

  const cards = searchListings({
    q,
    area,
    tenantId: tenantScoped ? session.tenantId! : undefined,
    statuses: [status],
  }).slice(0, 24)

  return {
    ok: true,
    tool: "search_listings",
    data: {
      count: cards.length,
      scopedTenantId: tenantScoped ? session.tenantId : null,
      listings: cards.map((c) => ({
        property: c.propertyName,
        slug: c.propertySlug,
        unit: c.code,
        area: c.area,
        city: c.cityLine,
        sqft: c.sqft,
        ratePsf: c.ratePsf,
        status: c.status,
        landlord: c.tenantName,
        ...(tenantScoped ? { propertyId: c.propertyId, unitId: c.unitId } : {}),
      })),
    },
  }
}

function toolPortfolioSummary(session: McpSession): McpToolResult {
  if (!session.tenantId) {
    return { ok: false, tool: "query_portfolio_summary", error: "Session tenant required." }
  }
  const overview = landlordOverview(session.tenantId)
  return {
    ok: true,
    tool: "query_portfolio_summary",
    data: { tenantId: session.tenantId, overview },
  }
}

function toolLedgerSummary(session: McpSession): McpToolResult {
  if (session.roleLevel === 2) {
    if (!session.tenantId) {
      return { ok: false, tool: "query_ledger_summary", error: "Session tenant required." }
    }
    const rows = ledgerForTenant(session.tenantId)
    const due = rows.filter((r) => r.status === "due")
    const paid = rows.filter((r) => r.status === "paid")
    return {
      ok: true,
      tool: "query_ledger_summary",
      data: {
        scope: "landlord_tenant",
        tenantId: session.tenantId,
        dueCount: due.length,
        dueCents: due.reduce((s, r) => s + r.amountCents, 0),
        paidCount: paid.length,
        recentDue: due.slice(0, 12).map(summarizeLedgerRow),
      },
    }
  }

  // Applicant / occupant: own ledger only.
  if (!session.userId) {
    return { ok: false, tool: "query_ledger_summary", error: "Authentication required." }
  }
  const rows = ledgerForUser(session.userId)
  const due = rows.filter((r) => r.status === "due")
  return {
    ok: true,
    tool: "query_ledger_summary",
    data: {
      scope: "occupant_self",
      userId: session.userId,
      dueCount: due.length,
      dueCents: due.reduce((s, r) => s + r.amountCents, 0),
      recentDue: due.slice(0, 12).map(summarizeLedgerRow),
    },
  }
}

function summarizeLedgerRow(r: {
  id: string
  kind: string
  description: string
  amountCents: number
  status: string
  dueOn: string | null
  tenantId: string
  unitCode: string
}) {
  return {
    id: r.id,
    kind: r.kind,
    description: r.description,
    amountCents: r.amountCents,
    status: r.status,
    dueOn: r.dueOn,
    unitCode: r.unitCode,
    // tenantId echoed only for landlord scope callers who already own it;
    // still safe here because rows are pre-scoped.
    tenantId: r.tenantId,
  }
}

function toolApplicationStatus(session: McpSession, args: Record<string, unknown>): McpToolResult {
  const applicationId = typeof args.applicationId === "string" ? args.applicationId : undefined

  if (session.roleLevel === 4) {
    if (!session.userId) {
      return { ok: false, tool: "get_application_status", error: "Authentication required." }
    }
    const apps = applicationsForApplicant(session.userId)
    const match = applicationId ? apps.find((a) => a.id === applicationId) : null
    if (applicationId && !match) {
      return { ok: false, tool: "get_application_status", error: "not_found" }
    }
    const list = match ? [match] : apps
    return {
      ok: true,
      tool: "get_application_status",
      data: {
        scope: "applicant_self",
        applications: list.map((a) => ({
          id: a.id,
          status: a.status,
          company: a.company,
          unit: a.unitCode,
          property: a.propertyName,
          createdAt: a.createdAt,
        })),
      },
    }
  }

  // Landlord / managing agent — tenant inbox only.
  if (!session.tenantId) {
    return { ok: false, tool: "get_application_status", error: "Session tenant required." }
  }
  const apps = applicationsForTenant(session.tenantId)
  const match = applicationId ? apps.find((a) => a.id === applicationId) : null
  if (applicationId && !match) {
    // Cross-tenant or missing → not_found (never leak other tenants).
    return { ok: false, tool: "get_application_status", error: "not_found" }
  }
  const list = match ? [match] : apps
  return {
    ok: true,
    tool: "get_application_status",
    data: {
      scope: "landlord_tenant",
      tenantId: session.tenantId,
      applications: list.map((a) => ({
        id: a.id,
        status: a.status,
        company: a.company,
        unit: a.unitCode,
        property: a.propertyName,
        createdAt: a.createdAt,
      })),
    },
  }
}

function toolReferralStatus(session: McpSession): McpToolResult {
  // Slice J Refer & Earn is not on Origin main yet — return empty pipeline, not invent data.
  return {
    ok: true,
    tool: "query_referral_status",
    data: {
      available: false,
      reason: "Refer & Earn desk not on this build; MCP returns an empty pipeline until Slice J lands.",
      userId: session.userId,
      indications: [],
      ledger: [],
    },
  }
}

function toolListMyJobs(session: McpSession): McpToolResult {
  if (!session.userId) {
    return { ok: false, tool: "list_my_jobs", error: "Authentication required." }
  }
  const jobs = jobsForProvider(session.userId)
  return {
    ok: true,
    tool: "list_my_jobs",
    data: {
      count: jobs.length,
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        trade: j.trade,
        property: j.propertyName,
        area: j.area,
        unit: j.unitCode,
        createdAt: j.createdAt,
        // Do not expose foreign landlord secrets; landlord name is ok.
        landlord: j.tenantName,
      })),
    },
  }
}

function toolCmsLandlords(session: McpSession): McpToolResult {
  const actor = requireActor(session)
  if (!("id" in actor)) return { ...actor, tool: "cms_list_landlords" }
  // Narrow staff: only roles cmsLandlords allows (super_admin / account_manager).
  if (actor.role !== "super_admin" && actor.role !== "account_manager") {
    return {
      ok: false,
      tool: "cms_list_landlords",
      error: "CMS landlords list requires Super Admin or Account Manager.",
    }
  }
  const { orgs, admins } = cmsLandlords(actor)
  return {
    ok: true,
    tool: "cms_list_landlords",
    data: {
      orgs,
      admins: admins.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        company: a.company,
        tenantId: a.tenantId,
      })),
    },
  }
}

function toolCmsApplicants(session: McpSession): McpToolResult {
  const actor = requireActor(session)
  if (!("id" in actor)) return { ...actor, tool: "cms_list_applicants" }
  if (
    actor.role !== "super_admin" &&
    actor.role !== "account_manager" &&
    actor.role !== "property_manager"
  ) {
    return {
      ok: false,
      tool: "cms_list_applicants",
      error: "CMS applicants list not permitted for this staff seat.",
    }
  }
  const people = cmsApplicants(actor)
  return {
    ok: true,
    tool: "cms_list_applicants",
    data: {
      count: people.length,
      applicants: people.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        company: p.company,
        meta: p.meta,
      })),
    },
  }
}

function toolCmsProviders(session: McpSession): McpToolResult {
  const actor = requireActor(session)
  if (!("id" in actor)) return { ...actor, tool: "cms_list_providers" }
  if (actor.role !== "super_admin" && actor.role !== "service_manager") {
    return {
      ok: false,
      tool: "cms_list_providers",
      error: "CMS providers list requires Super Admin or Service Manager.",
    }
  }
  const providers = cmsProviders(actor)
  return {
    ok: true,
    tool: "cms_list_providers",
    data: {
      count: providers.length,
      providers: providers.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        trade: p.trade,
        serviceArea: p.serviceArea,
        verified: p.providerVerified,
        meta: p.meta,
      })),
    },
  }
}

/** Sanity helper for tests — reload user by id. */
export function demoSession(userId: string): McpSession {
  const user = getUser(userId)
  if (!user) {
    throw new Error(`Unknown demo user: ${userId}`)
  }
  return sessionFromUser(user)
}
