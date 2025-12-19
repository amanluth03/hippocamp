# Hippo Campus - AWS Infrastructure
# Terraform configuration for thehippocampus.net

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state storage in S3 (uncomment after initial setup)
  # backend "s3" {
  #   bucket         = "hippocamp-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "hippocamp-terraform-locks"
  # }
}

# AWS Provider - US East 1 (required for CloudFront + ACM)
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "hippocamp"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Data source to get current AWS account info
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

