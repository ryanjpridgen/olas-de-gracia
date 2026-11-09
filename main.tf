terraform {
    required_providers {
      cloudflare = {
        source = "cloudflare/cloudflare"
        version = "~> 5"
      }
    }

    cloud {
      organization = "olas_de_gracia"

      workspaces {
        name = "web"
      }
    }
}

provider "cloudflare" {}

resource "cloudflare_d1_database" "bible_verses" {
  account_id = var.cloudflare_account_id
  name = "bible_verses"
  jurisdiction = "us"
}
