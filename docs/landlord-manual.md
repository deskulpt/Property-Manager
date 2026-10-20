# Landlord user manual

In-app: [`/help/landlord`](/help/landlord)

## Overview

Easy Rental is a multi-tenant leasing desk for Indian landlords. Segments: **warehouse**, **commercial**, **residential**.

**Pricing:** see pricing. Planned: Free plan (1 unit), then per-unit plans in **INR + 18% GST** when billing ships.

## Quick start

1. Sign up at [`/signup`](/signup) (privacy consent required).
2. Add a property at [`/landlord/properties/new`](/landlord/properties/new) (pick segment).
3. Share the public unit URL or QR poster.
4. Approve applications at [`/landlord/applications`](/landlord/applications).
5. Track INR ledger at [`/landlord/ledger`](/landlord/ledger). Optional NRI display currency in Settings.

## Segments

| Segment | Rent basis | GST on approve (default) |
| --- | --- | --- |
| Warehouse | ₹ / SF · month | Yes 18% |
| Commercial | Flat ₹ / month | Yes 18% |
| Residential | Flat ₹ / month | No (confirm with CA) |

## Demo vs real

Demo fixture org is labelled **DEMO · EasyRent Hyderabad**. Real signups use `is_demo=0` and never appear in the demo identity switcher.

## Settings

- Display currency (INR / USD / CAD / GBP view only)
- Razorpay shop keys (secret encrypted; never returned in full)
- Phone OTP demo
- Data export (DPDP) via **Download my data**
