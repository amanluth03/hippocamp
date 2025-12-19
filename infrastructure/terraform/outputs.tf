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

# Placeholder outputs - will be populated as we add resources
# output "api_gateway_url" {
#   description = "API Gateway endpoint URL"
#   value       = aws_apigatewayv2_api.main.api_endpoint
# }

# output "cloudfront_distribution_id" {
#   description = "CloudFront distribution ID"
#   value       = aws_cloudfront_distribution.main.id
# }

# output "cloudfront_domain" {
#   description = "CloudFront distribution domain"
#   value       = aws_cloudfront_distribution.main.domain_name
# }

# output "s3_photos_bucket" {
#   description = "S3 bucket for photo storage"
#   value       = aws_s3_bucket.photos.id
# }

# output "s3_frontend_bucket" {
#   description = "S3 bucket for frontend static files"
#   value       = aws_s3_bucket.frontend.id
# }

# output "rds_endpoint" {
#   description = "RDS PostgreSQL endpoint"
#   value       = aws_db_instance.main.endpoint
#   sensitive   = true
# }

