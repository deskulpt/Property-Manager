# Deploy pack — Cloudflare Free + Canada origin

| Path | Purpose |
| --- | --- |
| `cloudflare/` | Dedicated EasyRental CF account DNS + **ca-pay** Worker stub (OFF) |
| `oci/` | Always Free **Canada** VM Terraform / cloud-init / systemd (Aloke when ready) |

Docs: [`docs/hosting-cloudflare-oci.md`](../docs/hosting-cloudflare-oci.md)  
Scripts: [`scripts/hosting/`](../scripts/hosting/)

**Hard rules**

- CF account id `b2c682e130b734a072424bbf92367668` only — never old DeSkulpt CF.
- **Canada-first** origin; **PARK** OCI India / `in-pay` build.
- Create DNS for apex + `www` only after Canada origin IP exists.
- Never create `in-pay` / `ca-pay` DNS while flags are OFF.
- Focus stubs: `ca-pay` + Stripe Connect / `ontarioConnectDirectPad` remain OFF.
