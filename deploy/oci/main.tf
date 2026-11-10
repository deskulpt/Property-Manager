# Oracle Always Free — Canada VM stub for Easy Rental origin (Canada-first).
# Aloke creates/applies OCI later. Do not terraform apply without tenancy credentials.
#
# PARK India: do not use ap-mumbai-1 for this launch.
# Suggested region: ca-toronto-1 (Canada Southeast).
# Shape: VM.Standard.A1.Flex within Always Free quota, or available AMD micro.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 5.0.0"
    }
  }
}

variable "tenancy_ocid" { type = string }
variable "user_ocid" { type = string }
variable "fingerprint" { type = string }
variable "private_key_path" { type = string }
variable "region" {
  type    = string
  default = "ca-toronto-1"
}
variable "compartment_ocid" { type = string }
variable "ssh_public_key" { type = string }
variable "availability_domain" { type = string }
variable "subnet_ocid" { type = string }
variable "ubuntu_image_ocid" {
  type        = string
  description = "Canonical Ubuntu minimal image OCID for ca-toronto-1"
}
variable "assign_public_ip" {
  type    = bool
  default = true
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

resource "oci_core_instance" "easyrental" {
  availability_domain = var.availability_domain
  compartment_id      = var.compartment_ocid
  display_name        = "easyrental-ca-origin"
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = 1
    memory_in_gbs = 6
  }

  create_vnic_details {
    subnet_id        = var.subnet_ocid
    assign_public_ip = var.assign_public_ip
    hostname_label   = "easyrental"
  }

  source_details {
    source_type = "image"
    source_id   = var.ubuntu_image_ocid
    boot_volume_size_in_gbs = 50
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = base64encode(file("${path.module}/cloud-init.yaml"))
  }

  freeform_tags = {
    app     = "easyrental"
    plane   = "apex-origin"
    market  = "CA"
    managed = "aloke-later"
  }
}

output "public_ip_hint" {
  value       = "After apply, set ORIGIN_PUBLIC_IPV4 (or OCI_PUBLIC_IPV4) to the instance public IP and run scripts/hosting/cloudflare-dns-apply.sh"
  description = "DNS A record target for easyrental.space (proxied) — Canada origin"
}
