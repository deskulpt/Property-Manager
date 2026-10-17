"use client"

import { Mail, MessageCircle, Phone } from "lucide-react"
import { useMarket } from "@/components/market/market-provider"
import {
  contactForMarket,
  mailtoHref,
  telHref,
  whatsappHref,
} from "@/lib/brand-contact"

export function MarketContactStrip() {
  const { marketId } = useMarket()
  const contact = contactForMarket(marketId)
  const wa = whatsappHref(
    contact.whatsappE164,
    "Hello Easy Rental — I have a question about industrial leasing.",
  )

  return (
    <div className="border-b border-white/10 bg-brand text-paper">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-1.5 md:px-8">
        <div className="hidden min-w-0 flex-1 items-center gap-x-4 gap-y-1 text-[12px] sm:flex">
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-paper/55">
            {contact.label}
          </span>
          <a
            href={telHref(contact.supportPhoneE164)}
            className="truncate text-paper/90 transition-colors hover:text-paper"
          >
            Support {contact.supportPhoneDisplay}
          </a>
          <span className="text-paper/30" aria-hidden>
            ·
          </span>
          <a
            href={telHref(contact.salesPhoneE164)}
            className="truncate text-paper/90 transition-colors hover:text-paper"
          >
            Sales {contact.salesPhoneDisplay}
          </a>
        </div>

        <div className="flex flex-1 items-center gap-1 sm:hidden">
          <a
            href={telHref(contact.supportPhoneE164)}
            className="inline-flex h-8 w-8 items-center justify-center text-paper/90"
            aria-label={`Call support ${contact.supportPhoneDisplay}`}
          >
            <Phone className="h-4 w-4" />
          </a>
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center text-paper/90"
            aria-label="WhatsApp Easy Rental"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
          <a
            href={mailtoHref(contact.email)}
            className="inline-flex h-8 w-8 items-center justify-center text-paper/90"
            aria-label={`Email ${contact.email}`}
          >
            <Mail className="h-4 w-4" />
          </a>
          <span className="ml-1 truncate font-mono text-[10px] text-paper/55">
            {contact.supportPhoneDisplay}
          </span>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-paper/25 bg-paper/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-paper transition-colors hover:bg-paper/20"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            WhatsApp
          </a>
          <a
            href={telHref(contact.supportPhoneE164)}
            className="inline-flex items-center gap-1.5 border border-paper/25 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-paper transition-colors hover:bg-paper/10"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden />
            Call
          </a>
          <a
            href={mailtoHref(contact.email)}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium tracking-wide text-paper/80 transition-colors hover:text-paper"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
            Email
          </a>
        </div>
      </div>
    </div>
  )
}
