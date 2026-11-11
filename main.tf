terraform {
    required_providers {
      cloudflare = {
        source = "cloudflare/cloudflare"
        version = "~> 5"
      }
    }

    cloud {
      organization = "olas_de_gracia"
    }
}

provider "cloudflare" {}

resource "cloudflare_d1_database" "odg" {
  account_id = var.cloudflare_account_id
  name = "odg-${var.environment}"
  jurisdiction = "us"
}

resource "cloudflare_workflow" "ingestion_workflow" {
  account_id = var.cloudflare_account_id
  workflow_name = "bible-ingestion-${var.environment}"
  class_name = "BibleIngestionWorkflow"
  script_name = "olas-de-gracia"
}

output "database_id" {
  value = cloudflare_d1_database.odg.id
}
