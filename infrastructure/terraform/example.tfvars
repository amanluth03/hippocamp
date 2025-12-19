# Example Terraform variables file
# Copy this to terraform.tfvars and fill in your values
# DO NOT commit terraform.tfvars to git!

# AWS Configuration
aws_region  = "us-east-1"
environment = "prod"
domain_name = "thehippocampus.net"

# Database Configuration
db_instance_class = "db.t4g.micro"
db_name           = "hippocamp"
db_username       = "hippocamp_admin"
db_password       = "YOUR_SECURE_PASSWORD_HERE"

# Application Secrets
jwt_secret_key = "YOUR_JWT_SECRET_KEY_HERE"

# Google OAuth (from Google Cloud Console)
google_client_id     = "YOUR_GOOGLE_CLIENT_ID"
google_client_secret = "YOUR_GOOGLE_CLIENT_SECRET"

