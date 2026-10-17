/**
 * Public contact strip for Easy Rental (India).
 * E.164 links are real format for click-to-call / WhatsApp.
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
