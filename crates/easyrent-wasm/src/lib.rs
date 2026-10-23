use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = rustCoreVersion)]
pub fn rust_core_version() -> String {
    easyrent_core::RUST_CORE_VERSION.to_string()
}

#[wasm_bindgen(js_name = isValidTenantId)]
pub fn is_valid_tenant_id(id: &str) -> bool {
    easyrent_core::is_valid_tenant_id(id)
}

#[wasm_bindgen(js_name = isValidSlug)]
pub fn is_valid_slug(slug: &str) -> bool {
    easyrent_core::is_valid_slug(slug)
}

#[wasm_bindgen(js_name = slugifyOrg)]
pub fn slugify_org(name: &str) -> String {
    easyrent_core::slugify_org(name)
}

fn i(v: f64) -> i64 {
    if !v.is_finite() {
        return 0;
    }
    v.trunc() as i64
}

#[wasm_bindgen]
pub fn late_fee_cents(rent_cents: f64, flat_cents: f64, percent_bps: f64) -> f64 {
    easyrent_core::late_fee_cents(i(rent_cents), i(flat_cents), i(percent_bps)) as f64
}

#[wasm_bindgen]
pub fn gst_cents(taxable_minor: f64, gst_rate_bps: f64) -> f64 {
    easyrent_core::gst_cents(i(taxable_minor), i(gst_rate_bps)) as f64
}

#[wasm_bindgen]
pub fn monthly_rent_cents(
    rate_psf_milli: f64,
    area: f64,
    currency_minor_per_major: f64,
    rate_period_month: bool,
) -> f64 {
    easyrent_core::monthly_rent_cents(
        i(rate_psf_milli),
        i(area),
        i(currency_minor_per_major),
        rate_period_month,
    ) as f64
}

#[wasm_bindgen]
pub fn fx_micros(currency: &str) -> f64 {
    easyrent_core::money::fx_micros(currency) as f64
}

#[wasm_bindgen]
pub fn convert_from_inr_minor_display_cents(inr_minor: f64, rate_micros: f64) -> f64 {
    easyrent_core::convert_from_inr_minor_display_cents(i(inr_minor), i(rate_micros)) as f64
}

#[wasm_bindgen]
pub fn convert_from_inr_minor_major_milli(inr_minor: f64, rate_micros: f64) -> f64 {
    easyrent_core::money::convert_from_inr_minor_major_milli(i(inr_minor), i(rate_micros)) as f64
}

#[wasm_bindgen]
pub fn snap_pct(value: f64, grid: f64) -> f64 {
    easyrent_core::snap_pct(value, grid)
}

#[wasm_bindgen]
pub fn sanitize_plan_label(input: &str) -> String {
    easyrent_core::sanitize_plan_label(input)
}

#[wasm_bindgen]
pub fn normalize_slug(input: &str) -> String {
    easyrent_core::normalize_slug(input)
}

#[wasm_bindgen]
pub fn sqyd_to_sqft(sqyd: f64) -> f64 {
    easyrent_core::pack::sqyd_to_sqft(sqyd)
}

#[wasm_bindgen]
pub fn sqft_to_sqyd(sqft: f64) -> f64 {
    easyrent_core::pack::sqft_to_sqyd_milli(sqft) as f64 / 1000.0
}

/// `partitions_json` is `[{ "code": "1", "sqft": 3000 }, ...]`.
/// Returns plan-draft JSON string (`updatedAt` empty — TS stamps it).
#[wasm_bindgen]
pub fn auto_partition_layout(
    total_area: f64,
    partitions_json: &str,
    seed: f64,
    has_seed: bool,
    unit: &str,
) -> Result<String, JsValue> {
    let seed_opt = if has_seed {
        Some(i(seed).clamp(0, 1_000_000) as u32)
    } else {
        None
    };
    easyrent_core::pack::auto_partition_layout_string(total_area, partitions_json, seed_opt, unit)
        .map_err(|e| JsValue::from_str(&e))
}
