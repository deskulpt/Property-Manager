import { redirect } from "next/navigation"

/** Canonical landlord Ask Easy surface is `/landlord/ask` (unified with #12/#13). */
export default function AskEasyAliasPage() {
  redirect("/landlord/ask")
}
