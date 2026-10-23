# Credits and third-party assets

Easy Rental (easyrental.space) is a product of DeSkulpt Inc. Application code is MIT — see `LICENSE`.

## 3D seed assets (Slice B)

| Asset | Role | Licence | Notes |
| --- | --- | --- | --- |
| **Kenney City Kit (Commercial)** | Intended landlord GLB seed / marketing shell | **CC0** | [kenney.nl/assets/city-kit-commercial](https://kenney.nl/assets/city-kit-commercial). Courtesy attribution welcome. |
| **`public/models/seed-commercial.glb`** | Shipped demo shell with named bay meshes (A1–C2) | MIT (generated in-repo) | Kenney-style low-poly stand-in so `npm run reset` works offline. Replace with a Kenney building GLB for richer exteriors (`node scripts/generate-seed-glb.mjs` regenerates the stand-in). |
| **buildingSMART Duplex Apartment IFC** | Multi-storey IFC for floor peel + space mapping demos | **CC BY 4.0** — attribute buildingSMART International | [Community-Sample-Test-Files — Duplex](https://github.com/buildingsmart-community/Community-Sample-Test-Files/tree/main/IFC%202.3.0.1%20(IFC%202x3)/Duplex%20Apartment). Download into `data/uploads/` via landlord upload or `scripts/fetch-duplex-ifc.sh` when networking allows. **Do not** vendor Autodesk sample models. |

See [docs/seed-3d-models.md](./docs/seed-3d-models.md) for fetch steps and Matterport demoware rules.

## Matterport demoware (iframe only)

Seeded unit walkthroughs use **public Matterport show URLs** embedded in an iframe. Easy Rental does **not** download, mirror, or host Matterport mesh assets, and does **not** bundle the Matterport Showcase SDK.

| Unit | Model ID | Show URL |
| --- | --- | --- |
| waterman B1 | `PmWtWjyqpJs` | `https://my.matterport.com/show/?m=PmWtWjyqpJs` |
| waterman A2 | `VpGQDT9DFjr` | `https://my.matterport.com/show/?m=VpGQDT9DFjr` |
| waterman C2 | `caFmhpiUXSc` | `https://my.matterport.com/show/?m=caFmhpiUXSc` |
| commissioners H1 | `7Fdpg6tCFwu` | `https://my.matterport.com/show/?m=7Fdpg6tCFwu` |
| cranfield U1 | `U5p62iYcxeY` | `https://my.matterport.com/show/?m=U5p62iYcxeY` |

These tours are third-party demoware for local / OSS evaluator walkthroughs. Replace with the landlord’s own show URL before publishing production listings.

## Viewers

| Library | Licence | Use |
| --- | --- | --- |
| three.js + react-three-fiber + drei | MIT | GLB / OBJ viewer |
| web-ifc (That Open) | MPL-2.0 | IFC parse in browser |
| **Not used:** xeokit | AGPL-3.0 | Banned from the product tree |

## Maps / other

OpenStreetMap tiles and Leaflet remain the default public map stack (no Mapbox required).
