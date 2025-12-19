# Input Variables for Hippo Campus Infrastructure

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "thehippocampus.net"
}

variable "app_name" {
  description = "Application name used for resource naming"
  type        = string
  default     = "hippocamp"
}

# Database variables
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "hippocamp"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "hippocamp_admin"
  sensitive   = true
}

# These should be set via environment variables or tfvars file (not committed)
variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "jwt_secret_key" {
  description = "Secret key for JWT token signing"
  type        = string
  sensitive   = true
}

variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
}

