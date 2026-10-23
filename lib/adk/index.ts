/**
 * Easy Rental ADK surface — in-process TypeScript runner.
 * Architecture mirrors deskulpt/adk-okf-grounded-chat (ground first, mock without keys)
 * without requiring a Python sidecar to boot the Next app.
 */
export { runAdkTurn, adkRuntimeMode, looksLikeGroundedQuestion } from "@/lib/adk/runner"
export { executeAdkTool, ADK_TOOL_SPECS } from "@/lib/adk/tools"
export { resolveGeminiApiKey } from "@/lib/adk/gemini"
export type {
  AdkScope,
  AdkMode,
  AdkTurnInput,
  AdkTurnResult,
  AdkToolCall,
  AdkToolResult,
  AdkToolName,
} from "@/lib/adk/types"
