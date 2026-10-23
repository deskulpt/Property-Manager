import "server-only"
import { writeAuditEvent } from "@/lib/agentic/audit"
import { resolveModelPlan, resolveModelPlanSync, type ModelProviderId } from "@/lib/agentic/model"
import { dispatchTool, type ToolDispatchResult } from "@/lib/agentic/tools"
import type { AttributeCitation } from "@/lib/agentic/types"

export type AskEasyTurnResult = ToolDispatchResult & {
  modelProvider: ModelProviderId
  modelNote: string
  citations: AttributeCitation[]
  toolName?: string
}

export type RunAskEasyInput = {
  tenantId: string
  userId: string
  prompt: string
  propertyId?: string | null
  unitId?: string | null
  forceStub?: boolean
  onboard?: boolean
}

function auditPrompt(input: RunAskEasyInput) {
  writeAuditEvent({
    tenantId: input.tenantId,
    kind: "prompt",
    summary: input.prompt.trim().slice(0, 200) || "(onboard)",
    detail: {
      propertyId: input.propertyId ?? null,
      unitId: input.unitId ?? null,
      forceStub: Boolean(input.forceStub),
      onboard: Boolean(input.onboard),
    },
    actorUserId: input.userId,
  })
}

async function runWithPlan(input: RunAskEasyInput): Promise<AskEasyTurnResult> {
  const prompt = input.prompt.trim()
  if (!prompt && !input.onboard) {
    return {
      kind: "error",
      error: "Type a short prompt for Ask Easy.",
      modelProvider: "stub",
      modelNote: "Empty prompt.",
      citations: [],
    }
  }

  const effectivePrompt = prompt || "Onboard me — summarise my portfolio with real attributes."
  auditPrompt({ ...input, prompt: effectivePrompt })

  const plan = input.forceStub
    ? resolveModelPlanSync({
        tenantId: input.tenantId,
        prompt: effectivePrompt,
        propertyId: input.propertyId,
        unitId: input.unitId,
        onboard: input.onboard,
      })
    : await resolveModelPlan({
        tenantId: input.tenantId,
        prompt: effectivePrompt,
        propertyId: input.propertyId,
        unitId: input.unitId,
        onboard: input.onboard,
      })

  const call = plan.toolCalls[0]
  if (!call) {
    return {
      kind: "error",
      error: "Model returned no tool call.",
      modelProvider: plan.providerId,
      modelNote: plan.note,
      citations: [],
    }
  }

  const result = dispatchTool(
    call.toolName,
    {
      tenantId: input.tenantId,
      userId: input.userId,
      prompt: effectivePrompt,
      propertyId: input.propertyId,
      unitId: input.unitId,
    },
    call.args,
  )

  if (result.kind !== "error") {
    writeAuditEvent({
      tenantId: input.tenantId,
      kind: result.kind === "read" ? "read" : "propose",
      summary: `${call.toolName}: ${"reply" in result ? result.reply.slice(0, 160) : call.toolName}`,
      detail: {
        toolName: call.toolName,
        citationCount: "citations" in result && result.citations ? result.citations.length : 0,
      },
      actorUserId: input.userId,
      proposalId:
        result.kind === "propose_job_assignment" || result.kind === "draft_listing"
          ? result.proposal.id
          : null,
    })
  }

  const citations = "citations" in result && result.citations ? result.citations : []
  return {
    ...result,
    modelProvider: plan.providerId,
    modelNote: plan.note,
    citations,
    toolName: call.toolName,
  }
}

export async function runAskEasy(input: RunAskEasyInput): Promise<AskEasyTurnResult> {
  return runWithPlan(input)
}

export function runAskEasyStub(input: Omit<RunAskEasyInput, "forceStub">): AskEasyTurnResult {
  const prompt = input.prompt.trim() || (input.onboard ? "Onboard me" : "")
  if (!prompt) {
    return {
      kind: "error",
      error: "Type a short prompt for Ask Easy.",
      modelProvider: "stub",
      modelNote: "Empty prompt.",
      citations: [],
    }
  }
  auditPrompt({ ...input, prompt, forceStub: true })
  const plan = resolveModelPlanSync({
    tenantId: input.tenantId,
    prompt,
    propertyId: input.propertyId,
    unitId: input.unitId,
    onboard: input.onboard,
  })
  const call = plan.toolCalls[0]
  if (!call) {
    return {
      kind: "error",
      error: "Stub returned no tool call.",
      modelProvider: "stub",
      modelNote: plan.note,
      citations: [],
    }
  }
  const result = dispatchTool(call.toolName, {
    tenantId: input.tenantId,
    userId: input.userId,
    prompt,
    propertyId: input.propertyId,
    unitId: input.unitId,
  })
  const citations = "citations" in result && result.citations ? result.citations : []
  return {
    ...result,
    modelProvider: "stub",
    modelNote: plan.note,
    citations,
    toolName: call.toolName,
  }
}
