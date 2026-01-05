# Outputs for Hippo Campus Infrastructure
# These values will be displayed after terraform apply

output "aws_region" {
  description = "AWS region where resources are deployed"
  value       = var.aws_region
}

output "environment" {
  description = "Deployment environment"
  value       = var.environment
}

output "domain_name" {
  description = "Application domain name"
  value       = var.domain_name
}

# API Gateway
output "api_gateway_url" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.main.api_endpoint
}

# CloudFront
output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = aws_cloudfront_distribution.main.domain_name
}

# S3 Buckets
output "s3_photos_bucket" {
  description = "S3 bucket for photo storage"
  value       = aws_s3_bucket.photos.id
}

output "s3_frontend_bucket" {
  description = "S3 bucket for frontend static files"
  value       = aws_s3_bucket.frontend.id
}

# Database
output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

# Lambda
output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.api.function_name
}

output "thumbnail_lambda_name" {
  description = "Thumbnail Lambda function name"
  value       = aws_lambda_function.thumbnail.function_name
}

# Helpful for GitHub Secrets
output "github_secrets_summary" {
  description = "Values to add to GitHub Secrets"
  sensitive   = true
  value = <<-EOT
    
    ============================================
    ADD THESE TO GITHUB SECRETS:
    ============================================
    DOMAIN_NAME                = ${var.domain_name}
    S3_FRONTEND_BUCKET         = ${aws_s3_bucket.frontend.id}
    CLOUDFRONT_DISTRIBUTION_ID = ${aws_cloudfront_distribution.main.id}
    LAMBDA_FUNCTION_NAME       = ${aws_lambda_function.api.function_name}
    THUMBNAIL_LAMBDA_NAME      = ${aws_lambda_function.thumbnail.function_name}
    DATABASE_URL               = postgresql://${var.db_username}:<YOUR_DB_PASSWORD>@${aws_db_instance.main.endpoint}/${var.db_name}
    ============================================
    
  EOT
}
