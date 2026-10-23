//! Integer-safe INR ledger helpers. All amounts are minor units (paisa) unless noted.

/// Demo FX table: micros of display-currency major per 1 INR major.
/// Matches `DEMO_FX_PER_INR` in `lib/market.ts` (USD 0.012 → 12_000).
pub const DEMO_FX_MICROS_PER_INR: &[(&str, i64)] = &[
    ("INR", 1_000_000),
    ("USD", 12_000),
    ("CAD", 16_000),
    ("GBP", 9_500),
];

pub fn fx_micros(currency: &str) -> i64 {
    DEMO_FX_MICROS_PER_INR
        .iter()
        .find(|(code, _)| *code == currency)
        .map(|(_, m)| *m)
        .unwrap_or(1_000_000)
}

/// Late fee = max(flat, round(rent * percent_bps / 10_000)).
pub fn late_fee_cents(rent_cents: i64, flat_cents: i64, percent_bps: i64) -> i64 {
    let percent = div_round(rent_cents.saturating_mul(percent_bps), 10_000);
    flat_cents.max(percent)
}

/// GST = round(taxable * gst_rate_bps / 10_000). India default 1800 = 18%.
pub fn gst_cents(taxable_minor: i64, gst_rate_bps: i64) -> i64 {
    div_round(taxable_minor.saturating_mul(gst_rate_bps), 10_000)
}

/// Monthly rent in minor units from asking rate.
/// `rate_psf_milli` is ₹/SF (or market major) × 1000; `area` is square feet.
/// When `rate_period_month` is false, annual rates are divided by 12.
pub fn monthly_rent_cents(
    rate_psf_milli: i64,
    area: i64,
    currency_minor_per_major: i64,
    rate_period_month: bool,
) -> i64 {
    // monthly_major_milli = rate_psf_milli * area  (or /12)
    let monthly_major_milli = if rate_period_month {
        rate_psf_milli.saturating_mul(area)
    } else {
        div_round(rate_psf_milli.saturating_mul(area), 12)
    };
    // cents = round(monthly_major * minor_per_major) = round(milli * minor / 1000)
    div_round(
        monthly_major_milli.saturating_mul(currency_minor_per_major),
        1_000,
    )
}

/// Convert INR paisa → display-currency minor units (cents/pence) using micros FX.
/// Matches JS: `round((inrMinor / 100) * rate * 100)` = `round(inrMinor * rate)`.
pub fn convert_from_inr_minor_display_cents(inr_minor: i64, rate_micros: i64) -> i64 {
    div_round(inr_minor.saturating_mul(rate_micros), 1_000_000)
}

/// Display major as milli-majors (×1000) for formatting without float money.
pub fn convert_from_inr_minor_major_milli(inr_minor: i64, rate_micros: i64) -> i64 {
    // major = (inr_minor / 100) * (rate_micros / 1e6)
    // major_milli = inr_minor * rate_micros / 100 / 1000 = inr * rate / 100_000
    div_round(inr_minor.saturating_mul(rate_micros), 100_000)
}

/// Round half away from zero for positive/negative (matches JS Math.round for ≥0).
fn div_round(numer: i64, denom: i64) -> i64 {
    if denom == 0 {
        return 0;
    }
    if numer >= 0 {
        (numer + denom / 2) / denom
    } else {
        (numer - denom / 2) / denom
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn late_fee_takes_max_of_flat_and_percent() {
        // rent 100_000_00 paisa (₹1,00,000), 1.5% = 150 bps → 1_500_00; flat 25_00_00
        assert_eq!(late_fee_cents(10_000_000, 2_500_000, 150), 2_500_000);
        assert_eq!(late_fee_cents(10_000_000, 100_000, 150), 150_000);
    }

    #[test]
    fn gst_18_percent() {
        assert_eq!(gst_cents(10_000_00, 1800), 1_800_00);
        assert_eq!(gst_cents(1, 1800), 0);
        assert_eq!(gst_cents(3, 1800), 1); // round(0.54)=1
    }

    #[test]
    fn monthly_rent_month_period() {
        // ₹45.5/SF × 1000 SF → ₹45,500 → 4_550_000 paisa
        assert_eq!(monthly_rent_cents(45_500, 1000, 100, true), 4_550_000);
        assert_eq!(monthly_rent_cents(45_000, 2140, 100, true), 9_630_000);
    }

    #[test]
    fn fx_usd_display_cents() {
        // ₹100.00 (10_000 paisa) * 0.012 = $1.20 → 120 cents
        assert_eq!(
            convert_from_inr_minor_display_cents(10_000, fx_micros("USD")),
            120
        );
        assert_eq!(
            convert_from_inr_minor_display_cents(10_000, fx_micros("INR")),
            10_000
        );
    }
}
