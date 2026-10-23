import { redirect } from "next/navigation"

/** Occupant payments reuse the applicant ledger desk. */
export default function PortalPaymentsPage() {
  redirect("/account/payments")
}
