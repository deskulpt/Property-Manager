/**
 * Public contact strip for Easy Rental.
 * E.164 links are demo format for click-to-call / WhatsApp.
 */
export const BRAND_CONTACT = {
  supportPhoneE164: "+912240012345",
  supportPhoneDisplay: "+91 22 4001 2345",
  salesPhoneE164: "+912240012346",
  salesPhoneDisplay: "+91 22 4001 2346",
  whatsappE164: "912240012345",
  email: "hello@easyrental.space",
  label: "Contact",
} as const

/** Canada market display hints (demo numbers — not live CA support lines). */
export const BRAND_CONTACT_CA = {
  supportPhoneE164: "+14165550142",
  supportPhoneDisplay: "+1 (416) 555-0142",
  salesPhoneE164: "+14165550143",
  salesPhoneDisplay: "+1 (416) 555-0143",
  whatsappE164: "14165550142",
  email: "hello@easyrental.space",
  label: "Contact",
} as const

export function contactForMarket(marketId: "IN" | "CA") {
  return marketId === "CA" ? BRAND_CONTACT_CA : BRAND_CONTACT
}

export function telHref(e164: string) {
  return `tel:${e164}`
}

export function whatsappHref(e164Digits: string, text?: string) {
  const base = `https://wa.me/${e164Digits}`
  if (!text) return base
  return `${base}?text=${encodeURIComponent(text)}`
}

export function mailtoHref(email: string) {
  return `mailto:${email}`
}
