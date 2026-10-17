import type { MarketProfile } from "./types"

/** India market preferences — default. Razorpay UPI / eNACH. */
export const marketIN: MarketProfile = {
  id: "IN",
  name: "India",
  flag: "🇮🇳",
  locale: "en-IN",
  currency: "INR",
  currencyMinorPerMajor: 100,
  currencyLedgerNote: "Ledger and demo charges are INR (Razorpay / UPI / eNACH adapters).",
  phoneCountryCode: "+91",
  phonePlaceholder: "+91 98765 43210",
  pinLabel: "PIN code",
  pinPattern: /^\d{6}$/,
  pinPlaceholder: "400001",
  pinHint: "6-digit India PIN. First 3 digits map to a demo corridor.",
  rateUnitLabel: "₹ / SF · month",
  ratePeriod: "month",
  gstRateBps: 1800,
  gstLabel: "GST (18%)",
  primaryPaymentMethods: [
    {
      kind: "upi",
      label: "UPI (Razorpay demo)",
      hint: "VPA last segment only. Demo Razorpay UPI adapter — no NPCI call.",
    },
    {
      kind: "enach",
      label: "eNACH / auto-debit (demo)",
      hint: "Mandate last 4 digits. Demo adapter — no bank debit.",
    },
  ],
  paymentGateways: [
    {
      id: "razorpay",
      label: "Razorpay · UPI / cards (India)",
      hint: "Default India gateway. Demo mode never places live Razorpay charges.",
      demoOnly: true,
    },
  ],
  idDocuments: [{ country: "India", docType: "aadhaar", label: "Aadhaar" }],
  defaultCountry: "India",
  statesLabel: "State / UT",
  citiesHint: "Mumbai, Bengaluru, Chennai, Hyderabad, Pune, NCR",
  displayCurrencies: ["INR", "USD", "CAD", "GBP"],
  commercialCallout:
    "India C&I leasing desk — list once, lease direct. Easy Rental is a software marketplace, not a real-estate broker.",
  verifyDocHint: "India demo path uses Aadhaar. No UIDAI call; filename + simulated score only.",
  dutiesTaxHint: "India GST on taxable charges. Import duties N/A for domestic INR ledger.",
}
