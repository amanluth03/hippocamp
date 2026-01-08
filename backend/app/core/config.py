import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # ==========================================================================
    # Environment
    # ==========================================================================
    # IMPORTANT: Set DEBUG=false in production!
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # ==========================================================================
    # Database
    # ==========================================================================
    # Production: Set via DATABASE_URL environment variable
    # Format: postgresql://user:password@host:5432/dbname
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://hippocamp:hippocamp_local@localhost:5432/hippocamp"
    )
    
    # ==========================================================================
    # Google OAuth
    # ==========================================================================
    # Get these from Google Cloud Console: https://console.cloud.google.com
    # Production: Update redirect URI to https://thehippocampus.net/auth/callback
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "http://localhost:8000/auth/google/callback"
    )
    
    # ==========================================================================
    # JWT Authentication
    # ==========================================================================
    # IMPORTANT: Change SECRET_KEY in production! Use a secure random string.
    # Generate with: python -c "import secrets; print(secrets.token_urlsafe(64))"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "") or SECRET_KEY
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24 * 7  # 1 week
    
    # ==========================================================================
    # Frontend URL
    # ==========================================================================
    # Production: https://thehippocampus.net
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # ==========================================================================
    # AWS S3
    # ==========================================================================
    # Production: These are set via Lambda environment variables
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "us-east-1")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "")
    # Alias for Terraform compatibility
    AWS_S3_BUCKET: str = os.getenv("AWS_S3_BUCKET", "") or S3_BUCKET_NAME
    AWS_S3_REGION: str = os.getenv("AWS_S3_REGION", "") or AWS_REGION

    # ==========================================================================
    # AWS Bedrock (AI Image Analysis)
    # ==========================================================================
    # Model ID for Claude Haiku 4.5 (supports vision/image input)
    BEDROCK_MODEL_ID: str = os.getenv(
        "BEDROCK_MODEL_ID",
        "us.anthropic.claude-haiku-4-5-20251001-v1:0"
    )
    # Enable/disable AI analysis (useful for local dev without Bedrock access)
    BEDROCK_ENABLED: bool = os.getenv("BEDROCK_ENABLED", "false").lower() == "true"


settings = Settings()
