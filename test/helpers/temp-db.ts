import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, beforeEach } from "vitest"

/** Vitest hooks for an isolated SQLite file — not a React hook. */
export function installTempDatabase() {
  let dir: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "deskulpt-test-"))
    process.env.DESKULPT_DB_PATH = path.join(dir, "deskulpt.sqlite")
    process.env.DESKULPT_ALLOW_DB_CLI = "1"
  })

  afterEach(async () => {
    const { closeDatabase } = await import("@/lib/db")
    closeDatabase()
    fs.rmSync(dir, { recursive: true, force: true })
    delete process.env.DESKULPT_DB_PATH
  })
}
