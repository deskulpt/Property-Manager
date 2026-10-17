import fs from "node:fs"
import path from "node:path"
import type { ListingSiteId } from "@/lib/import/listing-schema"

const FIXTURE_FILES: Record<ListingSiteId, string> = {
  nobroker: "nobroker.html",
  "99acres": "99acres.html",
  magicbricks: "magicbricks.html",
  housing: "housing.html",
  "realtor-ca": "realtor-ca.html",
  kijiji: "kijiji.html",
  "loopnet-ca": "loopnet-ca.html",
}

export function readFixtureHtml(siteId: ListingSiteId): string {
  const file = FIXTURE_FILES[siteId]
  const full = path.join(process.cwd(), "lib", "import", "fixtures", file)
  return fs.readFileSync(full, "utf8")
}
