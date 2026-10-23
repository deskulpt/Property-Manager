# Seed 3D models (Slice B)

## What ships in the repo

| Path | Purpose |
| --- | --- |
| `public/models/seed-commercial.glb` | Offline demo building with mesh names `A1`…`C2` bound to BBM Bhiwandi Hub units on `npm run reset` |
| `scripts/generate-seed-glb.mjs` | Regenerates the stand-in GLB |
| `CREDITS.md` | Kenney CC0 + Duplex CC BY 4.0 + Matterport demoware notices |

`properties.model_path` for waterman is `/models/seed-commercial.glb` with `model_kind = glb`. Mesh bindings live in `unit_mesh_bindings`.

## Kenney City Kit (Commercial) — CC0

Preferred richer exterior for demos and marketing:

1. Download from [kenney.nl/assets/city-kit-commercial](https://kenney.nl/assets/city-kit-commercial).
2. Upload a building `.glb` on **Landlord → building → 3D model**.
3. Re-bind unit codes to mesh names in the R3F editor.

Courtesy attribution is appreciated even though CC0 does not require it.

## buildingSMART Duplex Apartment — CC BY 4.0

Multi-storey IFC for peel + space→unit demos:

1. Fetch from [buildingSMART Community Sample Test Files — Duplex](https://github.com/buildingsmart-community/Community-Sample-Test-Files/tree/main/IFC%202.3.0.1%20(IFC%202x3)/Duplex%20Apartment).
2. Upload via the landlord 3D card (IFC ≤ 50 MB; content sniff required).
3. Attribute **buildingSMART International** in published materials (CC BY 4.0).

Optional helper (when egress allows):

```bash
./scripts/fetch-duplex-ifc.sh
```

## Matterport

Iframe show URLs only — see `CREDITS.md` and PRD §4.6. Never mirror tour assets into `public/` or `data/uploads/`.

## Object storage

Uploads go through `ObjectStore` → `LocalDiskStore` under `data/uploads/{tenantId}/models|floorplans/`. S3 is not required for Slice B.
