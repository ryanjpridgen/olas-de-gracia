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
