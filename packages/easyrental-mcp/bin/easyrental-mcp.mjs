#!/usr/bin/env node
/**
 * Thin launcher → repo `scripts/mcp-stdio.ts` via tsx + tsconfig.mcp.json
 * (maps @/* and stubs server-only outside Next).
 */
import { spawn } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "../..")
const require = createRequire(resolve(repoRoot, "package.json"))

let tsxBin
try {
  tsxBin = require.resolve("tsx/cli")
} catch {
  console.error("easyrental-mcp: run `npm install` at the Property-Manager root (needs tsx).")
  process.exit(1)
}

const child = spawn(
  process.execPath,
  [tsxBin, "--tsconfig", "tsconfig.mcp.json", "scripts/mcp-stdio.ts"],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  },
)

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
