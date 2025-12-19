# CloudFront Distribution for Hippo Campus
# Routes traffic to both frontend (S3) and backend (API Gateway)

# =============================================================================
# CLOUDFRONT ORIGIN ACCESS CONTROL (for S3)
# =============================================================================

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.app_name}-frontend-oac"
  description                       = "OAC for frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "photos" {
  name                              = "${var.app_name}-photos-oac"
  description                       = "OAC for photos S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# =============================================================================
# S3 BUCKET POLICIES (allow CloudFront access)
# =============================================================================

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontAccess"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_policy" "photos_cloudfront" {
  bucket = aws_s3_bucket.photos.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontAccess"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.photos.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })
}

# =============================================================================
# CLOUDFRONT DISTRIBUTION
# =============================================================================

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Hippo Campus - ${var.environment}"
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # US, Canada, Europe only (cheaper)
  aliases             = [var.domain_name]

  # ==========================================================================
  # ORIGIN 1: Frontend (S3)
  # ==========================================================================
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # ==========================================================================
  # ORIGIN 2: API Gateway
  # ==========================================================================
  origin {
    domain_name = replace(aws_apigatewayv2_api.main.api_endpoint, "https://", "")
    origin_id   = "api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # ==========================================================================
  # ORIGIN 3: Photos (S3)
  # ==========================================================================
  origin {
    domain_name              = aws_s3_bucket.photos.bucket_regional_domain_name
    origin_id                = "photos"
    origin_access_control_id = aws_cloudfront_origin_access_control.photos.id
  }

  # ==========================================================================
  # DEFAULT BEHAVIOR: Frontend (S3)
  # ==========================================================================
  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "frontend"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id          = aws_cloudfront_cache_policy.static_assets.id
    origin_request_policy_id = null

    # Handle SPA routing - return index.html for 404s
    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_routing.arn
    }
  }

  # ==========================================================================
  # BEHAVIOR: API (/api/*)
  # ==========================================================================
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "api"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # Don't cache API responses
    cache_policy_id          = aws_cloudfront_cache_policy.api_no_cache.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.api_forward_all.id
  }

  # ==========================================================================
  # BEHAVIOR: Photos (/photos/*)
  # ==========================================================================
  ordered_cache_behavior {
    path_pattern           = "/photos/*"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "photos"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    cache_policy_id = aws_cloudfront_cache_policy.static_assets.id
  }

  # ==========================================================================
  # CUSTOM ERROR RESPONSES (SPA)
  # Note: These only apply to the default behavior (frontend S3)
  # API errors are passed through as-is
  # ==========================================================================
  # Removed - these were causing API errors to return index.html
  # The SPA routing CloudFront function handles 404s for frontend routes

  # ==========================================================================
  # RESTRICTIONS
  # ==========================================================================
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # ==========================================================================
  # SSL CERTIFICATE
  # ==========================================================================
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "${var.app_name}-cdn"
  }

  depends_on = [aws_acm_certificate_validation.main]
}

# =============================================================================
# CACHE POLICIES
# =============================================================================

resource "aws_cloudfront_cache_policy" "static_assets" {
  name        = "${var.app_name}-static-assets"
  comment     = "Cache static assets for 1 day"
  default_ttl = 86400
  max_ttl     = 604800
  min_ttl     = 1

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

resource "aws_cloudfront_cache_policy" "api_no_cache" {
  name        = "${var.app_name}-api-no-cache"
  comment     = "Don't cache API responses"
  default_ttl = 0
  max_ttl     = 0
  min_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

# =============================================================================
# ORIGIN REQUEST POLICIES
# =============================================================================

resource "aws_cloudfront_origin_request_policy" "api_forward_all" {
  name    = "${var.app_name}-api-forward-all"
  comment = "Forward headers/cookies to API"

  cookies_config {
    cookie_behavior = "all"
  }

  headers_config {
    header_behavior = "whitelist"
    headers {
      # Note: Authorization is forwarded automatically by CloudFront when using cache policy
      # Cannot explicitly list it here
      items = ["Content-Type", "Origin", "Accept"]
    }
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}

# =============================================================================
# CLOUDFRONT FUNCTION (SPA Routing)
# =============================================================================

resource "aws_cloudfront_function" "spa_routing" {
  name    = "${var.app_name}-spa-routing"
  runtime = "cloudfront-js-1.0"
  comment = "Rewrite paths for SPA routing"
  publish = true

  code = <<-EOF
    function handler(event) {
      var request = event.request;
      var uri = request.uri;
      
      // Don't rewrite API, photo, or asset requests
      if (uri.startsWith('/api/') || uri.startsWith('/photos/') || uri.includes('.')) {
        return request;
      }
      
      // Rewrite all other paths to index.html for SPA routing
      request.uri = '/index.html';
      return request;
    }
  EOF
}

