# S3 Buckets for Hippo Campus
# 1. Photos bucket - stores user uploaded photos
# 2. Frontend bucket - hosts static React build files

# =============================================================================
# PHOTOS BUCKET
# =============================================================================

resource "aws_s3_bucket" "photos" {
  bucket = "${var.app_name}-photos-${var.environment}"

  tags = {
    Name = "Hippo Campus Photos"
  }
}

# Block all public access - photos accessed via presigned URLs
resource "aws_s3_bucket_public_access_block" "photos" {
  bucket = aws_s3_bucket.photos.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning for photo recovery
resource "aws_s3_bucket_versioning" "photos" {
  bucket = aws_s3_bucket.photos.id

  versioning_configuration {
    status = "Enabled"
  }
}

# CORS configuration for presigned URL uploads from browser
resource "aws_s3_bucket_cors_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["https://${var.domain_name}"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# Lifecycle rule to move old photos to cheaper storage
resource "aws_s3_bucket_lifecycle_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  rule {
    id     = "archive-old-photos"
    status = "Enabled"

    # Apply to all objects in bucket
    filter {}

    # Move to Infrequent Access after 90 days
    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 1 year
    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }
}

# =============================================================================
# FRONTEND BUCKET (Static Website Hosting)
# =============================================================================

resource "aws_s3_bucket" "frontend" {
  bucket = "${var.app_name}-frontend-${var.environment}"

  tags = {
    Name = "Hippo Campus Frontend"
  }
}

# Block public access - CloudFront will access via OAC
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Static website configuration
resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html" # SPA - all routes go to index.html
  }
}

# =============================================================================
# TERRAFORM STATE BUCKET (for remote state storage)
# =============================================================================

# Generate random suffix for globally unique bucket name
resource "random_id" "state_bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.app_name}-terraform-state-${random_id.state_bucket_suffix.hex}"

  tags = {
    Name = "Hippo Campus Terraform State"
  }

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "${var.app_name}-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name = "Hippo Campus Terraform Locks"
  }
}

