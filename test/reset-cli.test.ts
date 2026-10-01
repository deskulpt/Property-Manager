import path from "node:path"
import { describe, expect, it } from "vitest"
import { closeDatabase, getDb, resetSeedDatabase } from "@/lib/db"

/**
 * Invoked by `npm run reset`. Restores the demo seed at DESKULPT_DB_PATH
 * or data/deskulpt.sqlite.
 */
describe("reset seed cli", () => {
  it("restores the demo sqlite seed", () => {
    if (!process.env.DESKULPT_DB_PATH) {
      process.env.DESKULPT_DB_PATH = path.join(process.cwd(), "data", "deskulpt.sqlite")
    }
    closeDatabase()
    getDb()
    resetSeedDatabase()
    const version = getDb().prepare("SELECT value FROM meta WHERE key = 'seed_version'").get() as {
      value: string
    }
    expect(version.value).toBeTruthy()
    const maya = getDb().prepare("SELECT id FROM users WHERE id = 'u_maya'").get()
    expect(maya).toBeTruthy()
    closeDatabase()
    console.log(`Seed restored at ${process.env.DESKULPT_DB_PATH}`)
  })
})
