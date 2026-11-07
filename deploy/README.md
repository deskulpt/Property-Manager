# Deploy pack — Cloudflare Free + OCI Always Free India

| Path | Purpose |
| --- | --- |
| `cloudflare/` | Dedicated EasyRental CF account DNS desired state + reserved ca-pay Worker stub |
| `oci/` | Always Free India VM Terraform / cloud-init / systemd (Aloke applies later) |

Docs: [`docs/hosting-cloudflare-oci.md`](../docs/hosting-cloudflare-oci.md)  
Scripts: [`scripts/hosting/`](../scripts/hosting/)

**Hard rules**

- CF account id `b2c682e130b734a072424bbf92367668` only — never old DeSkulpt CF.
- Create DNS for apex + `www` only after `OCI_PUBLIC_IPV4` exists.
- Never create `in-pay` / `ca-pay` while `inPayPlane` / `caPayPlane` are OFF.
