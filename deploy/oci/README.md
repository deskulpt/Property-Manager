# OCI Always Free — India origin (Aloke creates later)

Terraform + cloud-init + systemd stubs for the apex Easy Rental Node/SQLite app.

1. Create tenancy / Always Free capacity in **ap-mumbai-1**.
2. Fill `terraform.tfvars` (not committed) from variables in `main.tf`.
3. `terraform plan` then `terraform apply` when ready.
4. SSH in → `scripts/hosting/oci-bootstrap.sh`
5. Deploy app → `scripts/hosting/deploy-app.sh`
6. Export `OCI_PUBLIC_IPV4` and apply Cloudflare DNS (apex + www only).

Do **not** deploy `in-pay` / `ca-pay` from this stack — those are separate services behind `in-pay` / `ca-pay`.
