/**
 * Agentic SEO/a11y crawler demo — scores public routes, stores last run in SQLite.
 * Meta-fix proposals require human approval (Ask Easy–adjacent gate).
 */
import "server-only"
import { getDb } from "@/lib/db"
import { PUBLIC_CRAWL_ROUTES } from "@/lib/seo"

export type CrawlIssue = {
  code: string
  severity: "info" | "warn" | "error"
  message: string
  hint?: string
}

export type CrawlPageResult = {
  path: string
  title: string
  status: number
  score: number
  issues: CrawlIssue[]
}

export type MetaFixProposal = {
  id: string
  path: string
  field: "title" | "description" | "h1"
  current: string
  proposed: string
  status: "proposed" | "approved" | "rejected" | "published"
}

export type CrawlerRun = {
  id: string
  startedAt: string
  finishedAt: string
  avgScore: number
  pageCount: number
  pages: CrawlPageResult[]
  proposals: MetaFixProposal[]
}

type Sql = ReturnType<typeof getDb>

function ensureCrawlerSchema(db: Sql) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS crawler_runs (
      id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL,
      avg_score REAL NOT NULL,
      page_count INTEGER NOT NULL,
      payload_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS crawler_meta_proposals (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      path TEXT NOT NULL,
      field TEXT NOT NULL,
      current_value TEXT NOT NULL,
      proposed_value TEXT NOT NULL,
      status TEXT NOT NULL,
      decided_at TEXT,
      FOREIGN KEY (run_id) REFERENCES crawler_runs(id)
    );
  `)
}

/** Heuristic score for a known public route (no live HTTP in demo — uses route catalog + rules). */
function scoreRoute(path: string, title: string): CrawlPageResult {
  const issues: CrawlIssue[] = []
  let score = 100

  if (path === "/") {
    issues.push({
      code: "og_home",
      severity: "info",
      message: "Home has Organization JSON-LD and OG defaults from root layout.",
    })
  }

  if (path === "/tools/rent-estimate") {
    issues.push({
      code: "tool_disclaimer",
      severity: "info",
      message: "Rent tool must keep an estimate-only disclaimer visible.",
      hint: "Verify disclaimer copy remains above the fold.",
    })
  }

  if (title.length < 8) {
    score -= 15
    issues.push({
      code: "title_short",
      severity: "warn",
      message: `Title "${title}" is short for SERP snippets.`,
      hint: "Aim for 30–60 characters with brand + intent.",
    })
  }

  if (!path.includes("legal") && path !== "/login" && path !== "/signup") {
    issues.push({
      code: "heading_check",
      severity: "info",
      message: "Expect a single semantic H1 and descriptive H2 sections.",
    })
  }

  // A11y hints (static checklist — live DOM audit is UX sibling scope).
  issues.push({
    code: "a11y_contrast",
    severity: "info",
    message: "Check WCAG AA contrast on brand navy / cyan / terra vs paper.",
  })
  issues.push({
    code: "a11y_landmarks",
    severity: "info",
    message: "Confirm header/nav/main/footer landmarks and skip target.",
  })

  if (path.startsWith("/legal")) {
    score = Math.min(score, 92)
  }

  return {
    path,
    title,
    status: 200,
    score: Math.max(40, Math.min(100, score)),
    issues,
  }
}

function proposeMetaFixes(pages: CrawlPageResult[]): MetaFixProposal[] {
  const proposals: MetaFixProposal[] = []
  for (const page of pages) {
    if (page.issues.some((i) => i.code === "title_short")) {
      proposals.push({
        id: `fix_${page.path.replace(/\W+/g, "_")}_title`,
        path: page.path,
        field: "title",
        current: page.title,
        proposed: `${page.title} | Industrial leasing · Easy Rental`,
        status: "proposed",
      })
    }
  }
  // Always offer one sample description fix on /about for the approval demo.
  if (!proposals.some((p) => p.path === "/about")) {
    proposals.push({
      id: "fix_about_description",
      path: "/about",
      field: "description",
      current: "About Easy Rental",
      proposed:
        "Easy Rental by DeSkulpt Inc. — India C&I leasing desk with direct apply, maps, and landlord ops.",
      status: "proposed",
    })
  }
  return proposals
}

export function runPublicCrawler(): CrawlerRun {
  const db = getDb()
  ensureCrawlerSchema(db)
  const startedAt = new Date().toISOString()
  const pages = PUBLIC_CRAWL_ROUTES.map((route) => scoreRoute(route.path, route.title))
  const proposals = proposeMetaFixes(pages)
  const avgScore =
    pages.reduce((sum, p) => sum + p.score, 0) / Math.max(1, pages.length)
  const finishedAt = new Date().toISOString()
  const id = `crawl_${Date.now().toString(36)}`

  const run: CrawlerRun = {
    id,
    startedAt,
    finishedAt,
    avgScore: Math.round(avgScore * 10) / 10,
    pageCount: pages.length,
    pages,
    proposals,
  }

  db.prepare(
    `INSERT INTO crawler_runs (id, started_at, finished_at, avg_score, page_count, payload_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, startedAt, finishedAt, run.avgScore, run.pageCount, JSON.stringify(run))

  for (const proposal of proposals) {
    db.prepare(
      `INSERT INTO crawler_meta_proposals
        (id, run_id, path, field, current_value, proposed_value, status, decided_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    ).run(
      proposal.id,
      id,
      proposal.path,
      proposal.field,
      proposal.current,
      proposal.proposed,
      proposal.status,
    )
  }

  return run
}

export function getLastCrawlerRun(): CrawlerRun | null {
  const db = getDb()
  ensureCrawlerSchema(db)
  const row = db
    .prepare(
      `SELECT payload_json FROM crawler_runs ORDER BY finished_at DESC LIMIT 1`,
    )
    .get() as { payload_json: string } | undefined
  if (!row) return null
  try {
    const run = JSON.parse(row.payload_json) as CrawlerRun
    // Refresh proposal statuses from table (approval mutations).
    const props = db
      .prepare(
        `SELECT id, path, field, current_value, proposed_value, status
         FROM crawler_meta_proposals WHERE run_id = ?`,
      )
      .all(run.id) as {
      id: string
      path: string
      field: MetaFixProposal["field"]
      current_value: string
      proposed_value: string
      status: MetaFixProposal["status"]
    }[]
    if (props.length) {
      run.proposals = props.map((p) => ({
        id: p.id,
        path: p.path,
        field: p.field,
        current: p.current_value,
        proposed: p.proposed_value,
        status: p.status,
      }))
    }
    return run
  } catch {
    return null
  }
}

export function setMetaProposalStatus(
  proposalId: string,
  status: "approved" | "rejected" | "published",
): { ok: true } | { ok: false; error: string } {
  const db = getDb()
  ensureCrawlerSchema(db)
  const existing = db
    .prepare(`SELECT id, status FROM crawler_meta_proposals WHERE id = ?`)
    .get(proposalId) as { id: string; status: string } | undefined
  if (!existing) return { ok: false, error: "Proposal not found." }

  if (status === "published" && existing.status !== "approved") {
    return { ok: false, error: "Approve the meta fix before publishing." }
  }

  db.prepare(
    `UPDATE crawler_meta_proposals SET status = ?, decided_at = ? WHERE id = ?`,
  ).run(status, new Date().toISOString(), proposalId)

  // Keep payload_json in sync for last run display.
  const runId = (
    db.prepare(`SELECT run_id FROM crawler_meta_proposals WHERE id = ?`).get(proposalId) as
      | { run_id: string }
      | undefined
  )?.run_id
  if (runId) {
    const run = getLastCrawlerRun()
    if (run && run.id === runId) {
      db.prepare(`UPDATE crawler_runs SET payload_json = ? WHERE id = ?`).run(
        JSON.stringify(run),
        runId,
      )
    }
  }

  return { ok: true }
}
