//! Orthogonal rectangle packing for landlord unit plan auto-design.
//! Port of `autoPartitionLayout` in `lib/plan-draft.ts` — parity with Mulberry32 seed.

use serde_json::{json, Value};

pub const PLAN_DRAFT_VERSION: u32 = 1;

#[derive(Clone, Debug)]
pub struct PartitionInput {
    pub code: String,
    pub sqft: f64,
}

/// Snap percent coords to a light grid (default 2%). Matches TS `snapPct`.
pub fn snap_pct(value: f64, grid: f64) -> f64 {
    let grid = if grid == 0.0 { 2.0 } else { grid };
    let snapped = js_round(value / grid) * grid;
    snapped.clamp(0.0, 100.0)
}

pub fn sqyd_to_sqft(sqyd: f64) -> f64 {
    sqyd * 9.0
}

/// Returns milli-sqyd (×1000) for integer-friendly conversion.
pub fn sqft_to_sqyd_milli(sqft: f64) -> i64 {
    // sqft / 9 * 1000, rounded
    js_round(sqft / 9.0 * 1000.0) as i64
}

/// Build a plan-draft JSON object (without `updatedAt` — caller stamps ISO time).
pub fn auto_partition_layout_json(
    total_area: f64,
    partitions: &[PartitionInput],
    seed: Option<u32>,
    unit: &str,
) -> Value {
    let total_area = total_area.clamp(1.0, 5_000_000.0);
    let parts: Vec<(String, f64)> = partitions
        .iter()
        .map(|p| {
            let code = {
                let cleaned = crate::text::sanitize_plan_label(&p.code)
                    .chars()
                    .filter(|c| !c.is_whitespace())
                    .take(12)
                    .collect::<String>();
                if cleaned.is_empty() {
                    "U".to_string()
                } else {
                    cleaned
                }
            };
            let sqft = p.sqft.clamp(1.0, total_area);
            (code, sqft)
        })
        .filter(|(_, s)| *s > 0.0)
        .take(24)
        .collect();

    let sum_units: f64 = parts.iter().map(|(_, s)| *s).sum();
    let corridor_area = (total_area - sum_units).max(0.0);
    let mut rand = Mulberry32::new(seed.unwrap_or(1));

    let margin = 4.0_f64;
    let usable = 100.0 - margin * 2.0;
    let corridor_strip = if corridor_area > 0.0 {
        ((corridor_area / total_area) * usable)
            .max(6.0)
            .min(18.0)
    } else {
        0.0
    };
    let pack_height = usable - corridor_strip;
    let mut x = margin;
    let mut y = margin;
    let mut row_h = snap_pct(12.0 + rand.next() * 10.0, 2.0);
    let mut elements: Vec<Value> = Vec::new();

    if corridor_strip > 0.0 {
        elements.push(json!({
            "id": "el_corridor",
            "kind": "corridor",
            "x": margin,
            "y": margin + pack_height,
            "w": usable,
            "h": snap_pct(corridor_strip, 2.0),
            "label": "Corridor / common",
            "sqft": js_round(corridor_area),
        }));
    }

    for (i, (code, sqft)) in parts.iter().enumerate() {
        let share = sqft / sum_units.max(1.0);
        let mut w = snap_pct((10.0_f64).max(share * usable * (0.85 + rand.next() * 0.3)), 2.0);
        if x + w > margin + usable {
            x = margin;
            y += row_h + 2.0;
            row_h = snap_pct(12.0 + rand.next() * 10.0, 2.0);
            if y + row_h > margin + pack_height {
                row_h = (8.0_f64).max(margin + pack_height - y);
            }
            w = w.min(usable);
        }
        let h = row_h.min((8.0_f64).max(margin + pack_height - y));
        if h < 6.0 {
            break;
        }
        elements.push(json!({
            "id": format!("el_unit_{i}_{code}"),
            "kind": "unit",
            "x": snap_pct(x, 2.0),
            "y": snap_pct(y, 2.0),
            "w": snap_pct(w.min(margin + usable - x), 2.0),
            "h": snap_pct(h, 2.0),
            "label": format!("Unit {code}"),
            "unitCode": code,
            "sqft": sqft,
        }));
        elements.push(json!({
            "id": format!("el_door_{i}"),
            "kind": "door",
            "x": snap_pct(x + w / 2.0 - 2.0, 2.0),
            "y": snap_pct(y + h - 1.0, 2.0),
            "w": 4,
            "rotation": 0,
        }));
        x += w + 2.0;
    }

    let wall_ids = ["n", "e", "s", "w"];
    let wall_coords: [[f64; 4]; 4] = [
        [margin, margin, margin + usable, margin],
        [margin + usable, margin, margin + usable, margin + usable],
        [margin, margin + usable, margin + usable, margin + usable],
        [margin, margin, margin, margin + usable],
    ];
    for (i, coords) in wall_coords.iter().enumerate() {
        elements.push(json!({
            "id": format!("el_wall_{}", wall_ids[i]),
            "kind": "wall",
            "x1": coords[0],
            "y1": coords[1],
            "x2": coords[2],
            "y2": coords[3],
        }));
    }

    if rand.next() > 0.35 {
        elements.push(json!({
            "id": "el_lift",
            "kind": "lift",
            "x": snap_pct(margin + usable - 12.0, 2.0),
            "y": snap_pct(margin + 2.0, 2.0),
            "w": 10,
            "h": 10,
            "label": "Lift",
        }));
    }
    if rand.next() > 0.45 {
        elements.push(json!({
            "id": "el_bath",
            "kind": "bathroom",
            "x": snap_pct(margin + usable - 12.0, 2.0),
            "y": snap_pct(margin + 14.0, 2.0),
            "w": 10,
            "h": 8,
            "label": "Bath",
        }));
    }

    let unit = if unit == "sqyd" { "sqyd" } else { "sqft" };
    let mut draft = json!({
        "version": PLAN_DRAFT_VERSION,
        "unit": unit,
        "totalArea": total_area,
        "elements": elements,
        "updatedAt": "",
    });
    if let Some(s) = seed {
        draft
            .as_object_mut()
            .unwrap()
            .insert("seed".into(), json!(s));
    }
    draft
}

/// Serialize layout to a JSON string for WASM / FFI.
pub fn auto_partition_layout_string(
    total_area: f64,
    partitions_json: &str,
    seed: Option<u32>,
    unit: &str,
) -> Result<String, String> {
    #[derive(serde::Deserialize)]
    struct Part {
        code: String,
        sqft: f64,
    }
    let parts: Vec<Part> =
        serde_json::from_str(partitions_json).map_err(|e| format!("partitions json: {e}"))?;
    let inputs: Vec<PartitionInput> = parts
        .into_iter()
        .map(|p| PartitionInput {
            code: p.code,
            sqft: p.sqft,
        })
        .collect();
    let draft = auto_partition_layout_json(total_area, &inputs, seed, unit);
    serde_json::to_string(&draft).map_err(|e| e.to_string())
}

/// JS `Math.round` — half away from zero / toward +inf for positive .5.
fn js_round(v: f64) -> f64 {
    if v.is_nan() {
        return 0.0;
    }
    (v + if v >= 0.0 { 0.5 } else { -0.5 }).trunc()
}

struct Mulberry32 {
    t: u32,
}

impl Mulberry32 {
    fn new(seed: u32) -> Self {
        Self { t: seed }
    }

    fn next(&mut self) -> f64 {
        self.t = self.t.wrapping_add(0x6d2b79f5);
        let mut r = u32_imul(self.t ^ (self.t >> 15), 1 | self.t);
        r ^= u32_wrapping_add(r, u32_imul(r ^ (r >> 7), 61 | r));
        ((r ^ (r >> 14)) as f64) / 4294967296.0
    }
}

fn u32_imul(a: u32, b: u32) -> u32 {
    (a as i32).wrapping_mul(b as i32) as u32
}

fn u32_wrapping_add(a: u32, b: u32) -> u32 {
    a.wrapping_add(b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn snap_matches_ts() {
        assert_eq!(snap_pct(13.4, 2.0), 14.0);
        assert_eq!(snap_pct(-2.0, 2.0), 0.0);
        assert_eq!(snap_pct(101.0, 2.0), 100.0);
    }

    #[test]
    fn auto_partition_has_corridor_and_units() {
        let draft = auto_partition_layout_json(
            10_000.0,
            &[
                PartitionInput {
                    code: "1".into(),
                    sqft: 3000.0,
                },
                PartitionInput {
                    code: "2".into(),
                    sqft: 2500.0,
                },
                PartitionInput {
                    code: "3".into(),
                    sqft: 2000.0,
                },
            ],
            Some(7),
            "sqft",
        );
        let elements = draft["elements"].as_array().unwrap();
        assert!(elements.iter().any(|e| e["kind"] == "corridor"));
        assert_eq!(
            elements.iter().filter(|e| e["kind"] == "unit").count(),
            3
        );
        assert_eq!(draft["seed"], 7);
        assert_eq!(draft["version"], PLAN_DRAFT_VERSION);
    }

    #[test]
    fn seed_is_deterministic() {
        let a = auto_partition_layout_json(
            5000.0,
            &[PartitionInput {
                code: "A".into(),
                sqft: 2000.0,
            }],
            Some(42),
            "sqft",
        );
        let b = auto_partition_layout_json(
            5000.0,
            &[PartitionInput {
                code: "A".into(),
                sqft: 2000.0,
            }],
            Some(42),
            "sqft",
        );
        // Compare elements only (updatedAt empty both)
        assert_eq!(a["elements"], b["elements"]);
    }
}
