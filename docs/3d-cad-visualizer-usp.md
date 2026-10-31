# Easy Rental USP — 3D building + unit visualizer + CAD/PDF ingest

**Product:** Easy Rental (easyrental.space)  
**Status:** Deepen in progress (beyond tip `eb5a170` stub plate)  
**Audience:** L2 Landlord · L3 Managing agent · public property / unit viewers  
**Samples:** store `media/sample-layouts/` · fixture `test/fixtures/floor-ingest/mall-floor-plan.pdf`  
**Prior ingest:** store docs `cad-pdf-floor-ingest.md` · `brief-floor-map-unit-viewer.md`

---

## 1. Differentiator

Landlord/PM uploads a floor drawing → extract **only** leasing structure → editable floor plate → publish → **stacked 3D building** (PlanDraft extrude when no GLB) → floor select → **unit view** (Matterport / gallery images). Mobile-friendly DaisyUI-aligned controls, GSAP peel + R3F polish, clear empty/error/loading.

### Keep only

Walls (exterior + demising), unit/suite outlines, doors/openings, stairs, lifts, corridors, floor identity.

### Drop

Furniture, dims, titleblocks, hatch spam, MEP, defpoints.

---

## 2. Formats

| Input | Behavior |
| --- | --- |
| **PDF** | Inflate FlateDecode content streams; parse `m`/`l`/`re`/`h` path ops → walls + unit rects; SVG plate; stub fallback if sparse |
| **DXF (ASCII)** | LINE / LWPOLYLINE / INSERT filtered by layer → PlanDraft % |
| **DWG** | Reject with export guidance (DXF ASCII or PDF); ODA/LibreDWG convert path documented |
| **Images** | Keep plate + stub unit boxes for edit |

Primary E2E sample: `mall-floor-plan.pdf`.

---

## 3. Journey

```
Upload (PDF | DXF | image | DWG→guidance)
  → sniff + ObjectStore
  → simplify (keep walls/units/doors/stairs/lifts)
  → draft floor_map_versions + editable plate
  → UnitPlanCreator / HotspotEditor
  → publish → active_map_version_id + floors.plan_path / plan_draft_json
  → FloorStackViewer (GSAP) + DraftBuildingViewer (R3F extrude) or GLB BuildingModelViewer
  → floor select → unit page (Matterport embed or gallery images)
```

| Desk | Route |
| --- | --- |
| L2 Landlord | `/landlord/properties/[id]` |
| L3 Agent | `/agent/properties/[id]` |
| Public | `/properties/[slug]` · `/properties/[slug]/units/[code]` |

---

## 4. Key code

| Area | Path |
| --- | --- |
| Ingest pipeline | `lib/floor-ingest/*` (`pdf-vectors.ts`, `dxf.ts`, `pipeline.ts`) |
| Extrude | `lib/floor-extrude.ts` |
| Ingest UI | `components/floor/floor-ingest-panel.tsx` |
| Draft 3D | `components/floor/draft-building-viewer.tsx` |
| Stack peel | `components/floor/floor-stack-viewer.tsx` |
| GLB/IFC | `components/floor/building-model-viewer.tsx` |
| Matterport | `lib/matterport.ts` · `components/gallery/unit-gallery.tsx` |

---

## 5. Tests

- Unit: `test/floor-ingest.test.ts` (sniff, vectors, PDF/DXF/DWG, publish, extrude meshes)
- E2E: `e2e/floor-ingest.spec.ts` (mall PDF → versions → draft 3D)
- Suite: `npm test` · `npm run test:e2e`

---

## 6. Out of scope / follow-ups

- Native DWG via ODA cloud convert in-product
- Poppler high-DPI PDF raster plate
- Gemini semantic segmentation
- IFC `IfcSpace` auto-bind (Slice B mesh path remains separate)
