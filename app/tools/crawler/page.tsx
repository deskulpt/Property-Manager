import Link from "next/link"
import { CrawlerPanel } from "@/components/tools/crawler-panel"
import { getLastCrawlerRun } from "@/lib/crawler"
import { getSessionUser } from "@/lib/session"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "SEO crawler (tools)",
  description:
    "Demo agentic crawler for Easy Rental public routes — SEO/a11y scores with approval-gated meta fixes.",
  path: "/tools/crawler",
})

export default async function ToolsCrawlerPage() {
  const user = await getSessionUser()
  const allowed =
    user?.role === "super_admin" || user?.role === "landlord_admin"
  const lastRun = allowed ? getLastCrawlerRun() : null

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 md:px-8">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-terra">Tools</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold">SEO crawler</h1>
      <p className="mt-3 max-w-[56ch] text-ink-soft">
        Public entry for the same agent stub as{" "}
        <Link href="/console/crawler" className="text-terra underline-offset-4 hover:underline">
          /console/crawler
        </Link>
        . Sign in as super admin (or landlord) to run a crawl and approve meta fixes.
      </p>
      {!allowed ? (
        <p className="mt-8 border border-ink/15 bg-paper-2 px-4 py-3 text-sm">
          <Link href="/login" className="font-semibold text-terra">
            Log in
          </Link>{" "}
          with Avery (super admin) or a landlord seat to run the crawler.
        </p>
      ) : (
        <div className="mt-8">
          <CrawlerPanel lastRun={lastRun} mode="tools" />
        </div>
      )}
    </div>
  )
}
