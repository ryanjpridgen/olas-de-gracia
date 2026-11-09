terraform {
    required_providers {
      cloudflare = {
        source = "cloudflare/cloudflare"
        version = "~> 5"
      }
    }

    cloud {
      organization = "olas_de_gracias"
    }

    required_version = "1.17.1"
}

provider "cloudflare" {}

resource "cloudflare_d1_database" "odg" {
  account_id = var.cloudflare_account_id
  name = "odg-${var.environment}"
  jurisdiction = "us"
}

output "database_id" {
  value = cloudflare_d1_database.odg.id
}