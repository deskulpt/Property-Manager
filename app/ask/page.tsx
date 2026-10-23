import { AskChat } from "@/components/ask/ask-chat"
import { PageHeader } from "@/components/product"
import { adkRuntimeMode } from "@/lib/adk"
import Link from "next/link"

export const metadata = { title: "Ask · Easy Rental" }

/** Public catalog assistant only. Landlord desk = `/landlord/ask`. */
export default function PublicAskPage() {
  const runtime = adkRuntimeMode()
  return (
    <div className="mx-auto max-w-[800px] px-4 py-10 md:px-8">
      <PageHeader
        kicker="Ask"
        title="Public listing assistant"
        lede="Grounded answers from the public catalog only — no landlord desk data. Runs in local mock mode when no Gemini key is set."
      />
      <p className="mb-4 font-mono text-xs text-ink-soft">
        Runtime: <span className="text-[var(--color-brand-2)]">{runtime}</span>
        {" · "}
        Landlord desk:{" "}
        <Link href="/landlord/ask" className="underline underline-offset-4">
          Ask Easy
        </Link>
      </p>
      <AskChat
        scope="public"
        title="Search listings"
        lede="Ask about available bays, areas, or sizes. Results come from search_listings against public demo data."
        placeholder='e.g. “Available warehouse bays in Bhiwandi over 15,000 SF”'
      />
    </div>
  )
}
