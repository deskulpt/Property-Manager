import Link from "next/link"
import { statusLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

export function PageHeader({
  kicker,
  title,
  lede,
  actions,
}: {
  kicker: string
  title: string
  lede?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-secondary">{kicker}</p>
        <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-primary md:text-3xl">
          {title}
        </h1>
        {lede ? <p className="mt-3 max-w-2xl text-base text-ink-soft md:text-lg">{lede}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: { href: string; label: string }
}) {
  return (
    <div
      className="rounded-box border border-dashed border-base-300 bg-base-100 px-6 py-12 text-center"
      role="status"
      data-testid="empty-state"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-secondary">Empty</p>
      <h2 className="mt-3 font-serif text-2xl font-semibold text-primary">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-ink-soft">{body}</p>
      {action ? (
        <Link href={action.href} className="btn btn-primary btn-sm mt-5">
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}

export function NoticeBanner({ notice }: { notice?: string }) {
  if (!notice) return null
  return (
    <div className="alert alert-info mb-6 rounded-sm text-sm" role="status" data-testid="notice-banner">
      <span>{decodeURIComponent(notice.replace(/\+/g, " "))}</span>
    </div>
  )
}

export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div className="alert alert-error mb-6 rounded-sm text-sm" role="alert" data-testid="error-banner">
      <span>{decodeURIComponent(message.replace(/\+/g, " "))}</span>
    </div>
  )
}

const tones: Record<string, string> = {
  available: "badge-success",
  approved: "badge-success",
  paid: "badge-success",
  complete: "badge-success",
  accepted: "badge-primary",
  pending: "badge-warning",
  submitted: "badge-warning",
  assigned: "badge-warning",
  due: "badge-secondary",
  leased: "badge-ghost",
  hold: "badge-accent",
  denied: "badge-error",
  rejected: "badge-error",
  verified: "badge-success",
  open: "badge-primary",
  pending_payment: "badge-warning",
  fulfilling: "badge-primary",
  completed: "badge-success",
  cancelled: "badge-error",
  refunded: "badge-ghost",
  requested: "badge-warning",
  confirmed: "badge-success",
  declined: "badge-error",
  no_show: "badge-ghost",
  demo_verified: "badge-success",
  demo_failed: "badge-error",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "badge badge-sm rounded-sm font-mono uppercase tracking-wide",
        tones[status] ?? "badge-ghost",
      )}
    >
      {statusLabel(status)}
    </span>
  )
}

export function SpecList({
  rows,
}: {
  rows: { label: string; value: string }[]
}) {
  return (
    <dl className="border-t border-base-300">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-4 border-b border-base-300 py-2.5 text-sm"
        >
          <dt className="font-mono text-[11px] uppercase tracking-wider text-ink-soft">{row.label}</dt>
          <dd className="font-serif font-bold">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function RoleGate({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState title={title} body={body} action={action} />
    </div>
  )
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="grid gap-3" aria-busy="true" aria-live="polite" data-testid="loading-block">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">{label}</p>
      <div className="skeleton h-24 w-full rounded-sm" />
      <div className="skeleton h-24 w-full rounded-sm" />
      <div className="skeleton h-40 w-full rounded-sm" />
    </div>
  )
}

/** Interactive KPI tile for desk overviews. */
export function StatCard({
  label,
  value,
  href,
  hint,
}: {
  label: string
  value: React.ReactNode
  href?: string
  hint?: string
}) {
  const inner = (
    <>
      <div className="font-serif text-2xl font-semibold text-primary">{value}</div>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint">{label}</p>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </>
  )
  if (href) {
    return (
      <Link
        href={href}
        className="card rounded-sm border border-base-300 bg-base-100 p-4 transition-colors hover:border-secondary/50 hover:bg-base-200/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary active:scale-[0.99]"
      >
        {inner}
      </Link>
    )
  }
  return <div className="card rounded-sm border border-base-300 bg-base-100 p-4">{inner}</div>
}

export function ActionLink({
  href,
  children,
  variant = "secondary",
}: {
  href: string
  children: React.ReactNode
  variant?: "primary" | "secondary" | "ghost" | "accent"
}) {
  return (
    <Link
      href={href}
      className={cn(
        "btn btn-sm rounded-sm",
        variant === "primary" && "btn-primary",
        variant === "secondary" && "btn-secondary",
        variant === "ghost" && "btn-ghost",
        variant === "accent" && "btn-accent",
      )}
    >
      {children}
    </Link>
  )
}
