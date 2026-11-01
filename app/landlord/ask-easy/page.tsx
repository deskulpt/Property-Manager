import { redirect } from "next/navigation"

/** Alias → floating island open on landlord desk. */
export default function AskEasyAliasPage() {
  redirect("/landlord?ask=open")
}
