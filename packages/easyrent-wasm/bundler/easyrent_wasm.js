/* @ts-self-types="./easyrent_wasm.d.ts" */
import * as wasm from "./easyrent_wasm_bg.wasm";
import { __wbg_set_wasm } from "./easyrent_wasm_bg.js";

__wbg_set_wasm(wasm);
wasm.__wbindgen_start();
export {
    auto_partition_layout, convert_from_inr_minor_display_cents, convert_from_inr_minor_major_milli, fx_micros, gst_cents, isValidSlug, isValidTenantId, late_fee_cents, monthly_rent_cents, normalize_slug, rustCoreVersion, sanitize_plan_label, slugifyOrg, snap_pct, sqft_to_sqyd, sqyd_to_sqft
} from "./easyrent_wasm_bg.js";
