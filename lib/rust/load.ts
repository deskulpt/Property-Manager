/**
 * Server / Vitest entry for Rust WASM.
 * Client components must import `@/lib/rust/load.browser` only — never this file —
 * so webpack never resolves `node:module`.
 */
export type { RustApi } from "@/lib/rust/load.browser"
export { ensureBrowserRust } from "@/lib/rust/load.browser"
export {
  getRust,
  resetRustCache,
  rustAvailable,
  rustCoreBackend,
} from "@/lib/rust/load.node"
