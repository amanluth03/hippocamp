# Lambda Function and API Gateway for Hippo Campus Backend

# =============================================================================
# IAM ROLE FOR LAMBDA
# =============================================================================

resource "aws_iam_role" "lambda" {
  name = "${var.app_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.app_name}-lambda-role"
  }
}

# Basic Lambda execution policy (CloudWatch logs)
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# VPC access for Lambda (to reach RDS)
resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# S3 access policy for Lambda
resource "aws_iam_role_policy" "lambda_s3" {
  name = "${var.app_name}-lambda-s3-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.photos.arn,
          "${aws_s3_bucket.photos.arn}/*"
        ]
      }
    ]
  })
}

# Bedrock access policy for Lambda (AI image analysis)
resource "aws_iam_role_policy" "lambda_bedrock" {
  name = "${var.app_name}-lambda-bedrock-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel"
        ]
        Resource = [
          # Claude Haiku 4.5 model (cross-region inference)
          "arn:aws:bedrock:${var.aws_region}::foundation-model/us.anthropic.claude-haiku-4-5-20251001-v1:0",
          # Also allow other Claude models in case we switch
          "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.*",
          "arn:aws:bedrock:${var.aws_region}::foundation-model/us.anthropic.*"
        ]
      }
    ]
  })
}

# =============================================================================
# LAMBDA SECURITY GROUP
# =============================================================================

resource "aws_security_group" "lambda" {
  name        = "${var.app_name}-lambda-sg"
  description = "Security group for Lambda function"
  vpc_id      = data.aws_vpc.default.id

  # Outbound: Allow all (needed for RDS, S3, internet)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.app_name}-lambda-sg"
  }
}

# =============================================================================
# LAMBDA FUNCTION
# =============================================================================

# Placeholder zip file - will be replaced by CI/CD
resource "aws_lambda_function" "api" {
  function_name = "${var.app_name}-api-${var.environment}"
  role          = aws_iam_role.lambda.arn
  handler       = "lambda_handler.handler"
  runtime       = "python3.11"
  timeout       = 30
  memory_size   = 512

  # Placeholder - will be deployed via CI/CD
  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  # Note: Not in VPC - RDS is publicly accessible with password auth
  # This allows Lambda to access both RDS and internet (Google OAuth, etc.)

  environment {
    variables = {
      DEBUG                = "false"
      DATABASE_URL         = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}?sslmode=require"
      SECRET_KEY           = var.jwt_secret_key
      GOOGLE_CLIENT_ID     = var.google_client_id
      GOOGLE_CLIENT_SECRET = var.google_client_secret
      GOOGLE_REDIRECT_URI  = "https://${var.domain_name}/api/auth/google/callback"
      AWS_S3_BUCKET        = aws_s3_bucket.photos.id
      AWS_S3_REGION        = var.aws_region
      FRONTEND_URL         = "https://${var.domain_name}"
      # AI Image Analysis (Bedrock)
      BEDROCK_ENABLED      = "true"
      BEDROCK_MODEL_ID     = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
    }
  }

  tags = {
    Name = "${var.app_name}-api"
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
  ]
}

# Placeholder deployment package
data "archive_file" "lambda_placeholder" {
  type        = "zip"
  output_path = "${path.module}/lambda_placeholder.zip"

  source {
    content  = "# Placeholder - deployed via CI/CD"
    filename = "placeholder.py"
  }
}

# =============================================================================
# API GATEWAY (HTTP API)
# =============================================================================

resource "aws_apigatewayv2_api" "main" {
  name          = "${var.app_name}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins     = ["https://${var.domain_name}"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers     = ["Content-Type", "Authorization"]
    allow_credentials = true
    max_age           = 3600
  }

  tags = {
    Name = "${var.app_name}-api-gateway"
  }
}

# Lambda integration
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Route all requests to Lambda
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# API Gateway stage
resource "aws_apigatewayv2_stage" "main" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId        = "$context.requestId"
      ip               = "$context.identity.sourceIp"
      requestTime      = "$context.requestTime"
      httpMethod       = "$context.httpMethod"
      routeKey         = "$context.routeKey"
      status           = "$context.status"
      responseLength   = "$context.responseLength"
      integrationError = "$context.integrationErrorMessage"
    })
  }

  tags = {
    Name = "${var.app_name}-api-stage"
  }
}

# Permission for API Gateway to invoke Lambda
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# CloudWatch log group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${var.app_name}-api"
  retention_in_days = 14

  tags = {
    Name = "${var.app_name}-api-logs"
  }
}

# CloudWatch log group for Lambda
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.app_name}-api-${var.environment}"
  retention_in_days = 14

  tags = {
    Name = "${var.app_name}-lambda-logs"
  }
}

