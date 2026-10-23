/* tslint:disable */
/* eslint-disable */

/**
 * `partitions_json` is `[{ "code": "1", "sqft": 3000 }, ...]`.
 * Returns plan-draft JSON string (`updatedAt` empty — TS stamps it).
 */
export function auto_partition_layout(total_area: number, partitions_json: string, seed: number, has_seed: boolean, unit: string): string;

export function convert_from_inr_minor_display_cents(inr_minor: number, rate_micros: number): number;

export function convert_from_inr_minor_major_milli(inr_minor: number, rate_micros: number): number;

export function fx_micros(currency: string): number;

export function gst_cents(taxable_minor: number, gst_rate_bps: number): number;

export function isValidSlug(slug: string): boolean;

export function isValidTenantId(id: string): boolean;

export function late_fee_cents(rent_cents: number, flat_cents: number, percent_bps: number): number;

export function monthly_rent_cents(rate_psf_milli: number, area: number, currency_minor_per_major: number, rate_period_month: boolean): number;

export function normalize_slug(input: string): string;

export function rustCoreVersion(): string;

export function sanitize_plan_label(input: string): string;

export function slugifyOrg(name: string): string;

export function snap_pct(value: number, grid: number): number;

export function sqft_to_sqyd(sqft: number): number;

export function sqyd_to_sqft(sqyd: number): number;
