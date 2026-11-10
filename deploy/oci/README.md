# OCI Always Free — Canada origin (Aloke when ready)

**Canada-first.** Terraform + cloud-init + systemd for the apex Easy Rental Node/SQLite app.

**PARK India:** do not apply this stack in `ap-mumbai-1` / India for the Nov7 launch. Default region is **ca-toronto-1**.

1. Create tenancy / Always Free capacity in **ca-toronto-1** (or ca-montreal-1).
2. Fill `terraform.tfvars` (not committed) from variables in `main.tf`.
3. `terraform plan` then `terraform apply` when ready.
4. SSH in → `scripts/hosting/oci-bootstrap.sh`
5. Deploy app → `scripts/hosting/deploy-app.sh`
6. Export `ORIGIN_PUBLIC_IPV4` and apply Cloudflare DNS (apex + www only).

**Payment planes**

- `ca-pay` — stub Worker only (`deploy/cloudflare/workers/ca-pay/`); flag OFF; no DNS
- `in-pay` — **PARKED**; reserved hostname; **no build**
