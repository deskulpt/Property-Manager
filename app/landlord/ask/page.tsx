import { redirect } from "next/navigation"

export const metadata = { title: "Ask Easy" }

/**
 * Ask Easy primary UX is the floating island on authenticated landlord desks.
 * Keep this route as a deep-link alias that opens the island.
 * Agreement detail routes under `/landlord/ask/agreements/*` stay as pages.
 */
export default function AskEasyPage() {
  redirect("/landlord?ask=open")
}
