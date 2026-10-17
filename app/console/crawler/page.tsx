import { PageHeader } from "@/components/product"
import { CrawlerPanel } from "@/components/tools/crawler-panel"
import { requirePlatformAdmin } from "@/lib/console-gate"
import { getLastCrawlerRun } from "@/lib/crawler"

export const metadata = { title: "SEO crawler" }

export default async function ConsoleCrawlerPage() {
  await requirePlatformAdmin()
  const lastRun = getLastCrawlerRun()

  return (
    <div>
      <PageHeader
        kicker="Platform console"
        title="Agentic SEO crawler"
        lede="Crawl public marketing routes, score SEO/a11y hints, store the last run in SQLite, and gate meta-fix publish behind approval (Ask Easy–adjacent)."
      />
      <CrawlerPanel lastRun={lastRun} mode="console" />
    </div>
  )
}
