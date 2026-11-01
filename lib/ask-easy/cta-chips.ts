/**
 * Deep-link CTA chips shown inside the Ask Easy floating island.
 * Built from live desk state (pending approvals, drafts, properties) —
 * never invents entitlement or auto-runs mutations.
 */

export type AskEasyCtaChip = {
  id: string
  label: string
  href: string
  /** DaisyUI badge tone hint for urgent items */
  tone?: "default" | "warning" | "accent"
}

export type AskEasyCtaInput = {
  pendingCount: number
  draftCount: number
  propertyCount: number
  gated?: boolean
}

export function buildAskEasyCtaChips(input: AskEasyCtaInput): AskEasyCtaChip[] {
  if (input.gated) {
    return [
      {
        id: "settings-package",
        label: "Review package",
        href: "/landlord/settings",
        tone: "accent",
      },
      {
        id: "pricing",
        label: "Plans & subscribe",
        href: "/pricing",
      },
    ]
  }

  const chips: AskEasyCtaChip[] = [
    {
      id: "listings",
      label: "Listings",
      href: "/landlord/listings",
    },
    {
      id: "applications",
      label: "Applications",
      href: "/landlord/applications",
      tone: "default",
    },
    {
      id: "units",
      label: input.propertyCount > 0 ? "Floors & 3D" : "Add property",
      href: input.propertyCount > 0 ? "/landlord/properties" : "/landlord/properties",
    },
    {
      id: "jobs",
      label: "Concierge jobs",
      href: "/landlord/jobs",
    },
  ]

  if (input.pendingCount > 0) {
    chips.unshift({
      id: "approvals",
      label: `Approvals (${input.pendingCount})`,
      href: "/landlord?ask=open&askTab=approvals",
      tone: "warning",
    })
  }

  if (input.draftCount > 0) {
    chips.splice(input.pendingCount > 0 ? 1 : 0, 0, {
      id: "drafts",
      label: `Drafts (${input.draftCount})`,
      href: "/landlord/listings",
      tone: "accent",
    })
  }

  return chips
}

/** Unread/update badge count for the minimized bubble. */
export function askEasyBubbleBadgeCount(input: {
  pendingCount: number
  updateCount?: number
}): number {
  return Math.max(0, (input.pendingCount ?? 0) + (input.updateCount ?? 0))
}
