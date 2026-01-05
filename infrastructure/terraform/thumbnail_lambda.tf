# =============================================================================
# THUMBNAIL GENERATOR LAMBDA
# =============================================================================
# Triggered by S3 uploads, generates thumbnail sizes for faster loading

# Pillow Lambda Layer (community-maintained by Klayers)
# https://github.com/keithrozario/Klayers
# This provides Pillow compiled for Lambda's Linux environment
data "aws_lambda_layer_version" "pillow" {
  layer_name = "Klayers-p311-Pillow"
  # Use the latest compatible version
  # ARN: arn:aws:lambda:us-east-1:770693421928:layer:Klayers-p311-Pillow:X
}

# Placeholder for thumbnail Lambda code
data "archive_file" "thumbnail_placeholder" {
  type        = "zip"
  output_path = "${path.module}/thumbnail_placeholder.zip"

  source {
    content  = <<-EOF
      def handler(event, context):
          return {'statusCode': 200, 'body': 'Placeholder'}
    EOF
    filename = "handler.py"
  }
}

# Thumbnail Lambda Function
resource "aws_lambda_function" "thumbnail" {
  function_name = "${var.app_name}-thumbnail-${var.environment}"
  role          = aws_iam_role.lambda.arn  # Reuse existing Lambda role
  handler       = "handler.handler"
  runtime       = "python3.11"
  timeout       = 60  # Image processing can take time
  memory_size   = 1024  # More memory = faster processing

  # Placeholder - can be deployed via CI/CD or manually
  filename         = data.archive_file.thumbnail_placeholder.output_path
  source_code_hash = data.archive_file.thumbnail_placeholder.output_base64sha256

  # Use Pillow Lambda layer
  layers = [data.aws_lambda_layer_version.pillow.arn]

  environment {
    variables = {
      # No additional env vars needed - uses IAM role for S3 access
      LOG_LEVEL = "INFO"
    }
  }

  tags = {
    Name = "${var.app_name}-thumbnail"
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    aws_iam_role_policy.lambda_s3,
  ]
}

# CloudWatch log group for thumbnail Lambda
resource "aws_cloudwatch_log_group" "thumbnail_lambda" {
  name              = "/aws/lambda/${var.app_name}-thumbnail-${var.environment}"
  retention_in_days = 14

  tags = {
    Name = "${var.app_name}-thumbnail-logs"
  }
}

# =============================================================================
# S3 TRIGGER CONFIGURATION
# =============================================================================

# Permission for S3 to invoke the thumbnail Lambda
resource "aws_lambda_permission" "s3_invoke_thumbnail" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.thumbnail.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.photos.arn
}

# S3 bucket notification to trigger Lambda on uploads
resource "aws_s3_bucket_notification" "photos_upload" {
  bucket = aws_s3_bucket.photos.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.thumbnail.arn
    events              = ["s3:ObjectCreated:*"]
    
    # Only trigger for original uploads (not thumbnails)
    # Filter by prefix to include both events/ and memories/ folders
    filter_prefix = ""
    
    # Only process image files
    filter_suffix = ".jpg"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.thumbnail.arn
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = ".jpeg"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.thumbnail.arn
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = ".png"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.thumbnail.arn
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = ".webp"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.thumbnail.arn
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = ".heic"
  }

  depends_on = [aws_lambda_permission.s3_invoke_thumbnail]
}

