import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Inbox } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { statusLabel } from "@/lib/format"

export function PageHeader({
  kicker,
  title,
  lede,
}: {
  kicker: string
  title: string
  lede?: string
}) {
  return (
    <header className="mb-8">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-terra">{kicker}</p>
      <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h1>
      {lede ? <p className="mt-3 max-w-2xl text-lg text-ink-soft">{lede}</p> : null}
    </header>
  )
}

export function EmptyState({
  title,
  body,
  action,
  icon: Icon = Inbox,
}: {
  title: string
  body: string
  action?: { href: string; label: string }
  icon?: LucideIcon
}) {
  return (
    <div className="border border-dashed border-border bg-card px-6 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center border border-terra/30 bg-accent text-terra">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-terra">Empty</p>
      <h2 className="mt-3 font-serif text-2xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-ink-soft">{body}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center gap-2 font-serif text-sm font-bold text-terra underline underline-offset-4"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}

export function NoticeBanner({ notice }: { notice?: string }) {
  if (!notice) return null
  return (
    <p
      className="mb-6 border border-terra/25 bg-accent px-4 py-3 text-sm text-terra-dark"
      role="status"
    >
      {notice}
    </p>
  )
}

const tones: Record<string, string> = {
  available: "bg-avail/15 text-[#1f6b38]",
  approved: "bg-avail/15 text-[#1f6b38]",
  paid: "bg-avail/15 text-[#1f6b38]",
  complete: "bg-avail/15 text-[#1f6b38]",
  accepted: "bg-brand/10 text-brand",
  pending: "bg-pending/20 text-[#6b5210]",
  submitted: "bg-pending/20 text-[#6b5210]",
  assigned: "bg-pending/20 text-[#6b5210]",
  due: "bg-terra/15 text-terra-dark",
  leased: "bg-leased/20 text-ink-soft",
  denied: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
  verified: "bg-avail/15 text-[#1f6b38]",
  open: "bg-brand/10 text-brand",
  pending_payment: "bg-pending/20 text-[#6b5210]",
  fulfilling: "bg-brand/10 text-brand",
  completed: "bg-avail/15 text-[#1f6b38]",
  cancelled: "bg-destructive/10 text-destructive",
  refunded: "bg-leased/20 text-ink-soft",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`rounded-sm font-mono tracking-wide uppercase ${tones[status] ?? ""}`}>
      {statusLabel(status)}
    </Badge>
  )
}

export function SpecList({
  rows,
}: {
  rows: { label: string; value: string }[]
}) {
  return (
    <dl className="border-t border-border">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 text-sm"
        >
          <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">
            {row.label}
          </dt>
          <dd className="font-serif font-bold">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function RoleGate({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState title={title} body={body} />
    </div>
  )
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="grid gap-3" aria-busy="true" aria-live="polite">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{label}</p>
      <div className="h-24 motion-safe:animate-pulse bg-paper-2" />
      <div className="h-24 motion-safe:animate-pulse bg-paper-2" />
      <div className="h-40 motion-safe:animate-pulse bg-paper-2" />
    </div>
  )
}
