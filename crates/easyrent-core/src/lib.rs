//! Easy Rental pure-compute: integer money math + orthogonal plan packing.

pub mod money;
pub mod pack;
pub mod text;

pub use money::{
    convert_from_inr_minor_display_cents, gst_cents, late_fee_cents, monthly_rent_cents,
    DEMO_FX_MICROS_PER_INR,
};
pub use pack::{
    auto_partition_layout_json, snap_pct, sqft_to_sqyd_milli, sqyd_to_sqft, PartitionInput,
    PLAN_DRAFT_VERSION,
};
pub use text::{
    is_valid_slug, is_valid_tenant_id, normalize_slug, sanitize_plan_label, slugify_org,
};

/// Semver-ish stamp for health probes / diagnostics.
pub const RUST_CORE_VERSION: &str = env!("CARGO_PKG_VERSION");
