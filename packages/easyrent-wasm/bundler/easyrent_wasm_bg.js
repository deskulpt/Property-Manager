/**
 * `partitions_json` is `[{ "code": "1", "sqft": 3000 }, ...]`.
 * Returns plan-draft JSON string (`updatedAt` empty — TS stamps it).
 * @param {number} total_area
 * @param {string} partitions_json
 * @param {number} seed
 * @param {boolean} has_seed
 * @param {string} unit
 * @returns {string}
 */
export function auto_partition_layout(total_area, partitions_json, seed, has_seed, unit) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(partitions_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(unit, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.auto_partition_layout(total_area, ptr0, len0, seed, has_seed, ptr1, len1);
        var ptr3 = ret[0];
        var len3 = ret[1];
        if (ret[3]) {
            ptr3 = 0; len3 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred4_0 = ptr3;
        deferred4_1 = len3;
        return getStringFromWasm0(ptr3, len3);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}

/**
 * @param {number} inr_minor
 * @param {number} rate_micros
 * @returns {number}
 */
export function convert_from_inr_minor_display_cents(inr_minor, rate_micros) {
    const ret = wasm.convert_from_inr_minor_display_cents(inr_minor, rate_micros);
    return ret;
}

/**
 * @param {number} inr_minor
 * @param {number} rate_micros
 * @returns {number}
 */
export function convert_from_inr_minor_major_milli(inr_minor, rate_micros) {
    const ret = wasm.convert_from_inr_minor_major_milli(inr_minor, rate_micros);
    return ret;
}

/**
 * @param {string} currency
 * @returns {number}
 */
export function fx_micros(currency) {
    const ptr0 = passStringToWasm0(currency, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.fx_micros(ptr0, len0);
    return ret;
}

/**
 * @param {number} taxable_minor
 * @param {number} gst_rate_bps
 * @returns {number}
 */
export function gst_cents(taxable_minor, gst_rate_bps) {
    const ret = wasm.gst_cents(taxable_minor, gst_rate_bps);
    return ret;
}

/**
 * @param {string} slug
 * @returns {boolean}
 */
export function isValidSlug(slug) {
    const ptr0 = passStringToWasm0(slug, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.isValidSlug(ptr0, len0);
    return ret !== 0;
}

/**
 * @param {string} id
 * @returns {boolean}
 */
export function isValidTenantId(id) {
    const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.isValidTenantId(ptr0, len0);
    return ret !== 0;
}

/**
 * @param {number} rent_cents
 * @param {number} flat_cents
 * @param {number} percent_bps
 * @returns {number}
 */
export function late_fee_cents(rent_cents, flat_cents, percent_bps) {
    const ret = wasm.late_fee_cents(rent_cents, flat_cents, percent_bps);
    return ret;
}

/**
 * @param {number} rate_psf_milli
 * @param {number} area
 * @param {number} currency_minor_per_major
 * @param {boolean} rate_period_month
 * @returns {number}
 */
export function monthly_rent_cents(rate_psf_milli, area, currency_minor_per_major, rate_period_month) {
    const ret = wasm.monthly_rent_cents(rate_psf_milli, area, currency_minor_per_major, rate_period_month);
    return ret;
}

/**
 * @param {string} input
 * @returns {string}
 */
export function normalize_slug(input) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(input, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.normalize_slug(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * @returns {string}
 */
export function rustCoreVersion() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.rustCoreVersion();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * @param {string} input
 * @returns {string}
 */
export function sanitize_plan_label(input) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(input, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.sanitize_plan_label(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * @param {string} name
 * @returns {string}
 */
export function slugifyOrg(name) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.slugifyOrg(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * @param {number} value
 * @param {number} grid
 * @returns {number}
 */
export function snap_pct(value, grid) {
    const ret = wasm.snap_pct(value, grid);
    return ret;
}

/**
 * @param {number} sqft
 * @returns {number}
 */
export function sqft_to_sqyd(sqft) {
    const ret = wasm.sqft_to_sqyd(sqft);
    return ret;
}

/**
 * @param {number} sqyd
 * @returns {number}
 */
export function sqyd_to_sqft(sqyd) {
    const ret = wasm.sqyd_to_sqft(sqyd);
    return ret;
}
export function __wbindgen_generic_0000000000000001(arg0, arg1) {
    // Cast intrinsic for `Ref(String) -> Externref`.
    const ret = getStringFromWasm0(arg0, arg1);
    return ret;
}
export function __wbindgen_init_externref_table() {
    const table = wasm.__wbindgen_externrefs;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
}
function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;


let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}
