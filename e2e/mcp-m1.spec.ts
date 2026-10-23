import { expect, test } from "@playwright/test"

/**
 * MCP M1 HTTP smoke — propose returns proposal_id; reject leaves no side effect.
 * Uses Streamable HTTP JSON against POST /api/mcp (stateless; no session id).
 */

async function mcpCall(
  request: import("@playwright/test").APIRequestContext,
  toolName: string,
  args: Record<string, unknown> = {},
  token = "demo:u_nadia",
) {
  const res = await request.post("/api/mcp", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    },
    data: {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    },
  })
  const body = await res.json()
  return { status: res.status(), body }
}

function parseToolPayload(body: {
  result?: { content?: { type: string; text: string }[]; isError?: boolean }
  error?: unknown
}) {
  const text = body.result?.content?.find((c) => c.type === "text")?.text
  expect(text, `MCP tool text payload missing: ${JSON.stringify(body).slice(0, 400)}`).toBeTruthy()
  return JSON.parse(text!) as { ok: boolean; error?: string; data?: Record<string, unknown> }
}

test.describe("MCP M1 propose + approvals (HTTP)", () => {
  test("propose_job_assignment returns proposal_id; reject = no side effect", async ({
    request,
  }) => {
    const proposed = await mcpCall(request, "propose_job_assignment", {
      prompt: "Assign an electrician to fix the weather seal (e2e)",
      propertyId: "p_waterman",
    })
    expect(proposed.status).toBe(200)
    const prop = parseToolPayload(proposed.body)
    expect(prop.ok).toBe(true)
    expect(prop.data?.proposal_id).toBeTruthy()
    expect(prop.data?.status).toBe("pending")
    expect(prop.data?.never_auto).toBe(true)

    const proposalId = String(prop.data!.proposal_id)

    const listed = await mcpCall(request, "approvals.list", { status: "pending" })
    expect(listed.status).toBe(200)
    const list = parseToolPayload(listed.body)
    expect(list.ok).toBe(true)
    const proposals = (list.data?.proposals as { proposal_id: string }[]) ?? []
    expect(proposals.some((p) => p.proposal_id === proposalId)).toBe(true)

    const rejected = await mcpCall(request, "approvals.resolve", {
      proposal_id: proposalId,
      decision: "reject",
    })
    expect(rejected.status).toBe(200)
    const rej = parseToolPayload(rejected.body)
    expect(rej.ok).toBe(true)
    expect(rej.data?.side_effects).toBe(false)
  })

  test("applicant token cannot call never-auto propose", async ({ request }) => {
    const denied = await mcpCall(
      request,
      "propose_job_assignment",
      { prompt: "should fail" },
      "demo:u_maya",
    )
    expect(denied.status).toBe(200)
    // Tool is not advertised for applicant → MCP layer error (or handler ok:false).
    const errMsg = JSON.stringify(denied.body)
    const text = denied.body?.result?.content?.find(
      (c: { type: string; text: string }) => c.type === "text",
    )?.text as string | undefined
    if (text?.trim().startsWith("{")) {
      const payload = JSON.parse(text) as { ok: boolean }
      expect(payload.ok).toBe(false)
    } else {
      expect(errMsg).toMatch(/not found|Unknown tool|not available|MCP error|isError/i)
    }
  })
})
